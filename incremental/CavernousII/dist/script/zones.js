"use strict";
let currentZone = 0;
let displayZone = 0;
class Zone {
    constructor(name, map, goalReward = null) {
        this.index = -1;
        this.manaDrain = 0;
        this.name = name;
        this.originalMap = map;
        this.goalReward = goalReward;
        this.goalComplete = false;
        this.map = map.slice();
        this.yOffset = map.findIndex(row => row.includes("."));
        this.xOffset = map[this.yOffset].indexOf(".");
        this.mapLocations = [];
        this.manaGain = 0;
        this.queues = ActionQueue.fromJSON([[]]);
        this.routes = [];
        this.routesChanged = true;
        this.node = null;
        this.cacheManaGain = [0];
        this.startStuff = [];
        this.lastRoute = null;
        this.zoneStartTime = null;
        while (this.mapLocations.length < map.length) {
            this.mapLocations.push([]);
        }
        setTimeout(() => {
            this.index = zones.findIndex(z => z == this);
        });
    }
    getMapLocation(x, y, adj = false) {
        if (!adj && this.map[y + this.yOffset][x + this.xOffset] != "█") {
            this.getMapLocation(x - 1, y - 1, true);
            this.getMapLocation(x, y - 1, true);
            this.getMapLocation(x + 1, y - 1, true);
            this.getMapLocation(x - 1, y, true);
            this.getMapLocation(x + 1, y, true);
            this.getMapLocation(x - 1, y + 1, true);
            this.getMapLocation(x, y + 1, true);
            this.getMapLocation(x + 1, y + 1, true);
        }
        x += this.xOffset;
        y += this.yOffset;
        if (x < 0 || x >= this.map[0].length || y < 0 || y >= this.map.length)
            return null;
        if (!this.mapLocations[y][x]) {
            let mapSymbol = this.map[y][x];
            this.mapLocations[y][x] = new MapLocation(x - this.xOffset, y - this.yOffset, this, getLocationTypeBySymbol(mapSymbol));
            classMapping[mapSymbol][2] ? mapStain.push([x, y]) : mapDirt.push([x, y]);
        }
        return this.mapLocations[y][x];
    }
    getAdjLocations(x, y) {
        x += this.xOffset;
        y += this.yOffset;
        return [
            [x - 1, y],
            [x + 1, y],
            [x, y + 1],
            [x, y - 1]
        ]
            .map(adj => {
            if (adj[0] < 0 || adj[0] >= this.map[0].length || adj[1] < 0 || adj[1] >= this.map.length)
                return;
            return [this.map[adj[1]][adj[0]], this.mapLocations[adj[1]][adj[0]]];
        })
            .filter(x => x);
    }
    hasMapLocation(x, y) {
        return this.mapLocations[y] && this.mapLocations[y][x] !== undefined;
    }
    resetZone() {
        this.map = this.originalMap.slice();
        if (realms[currentRealm].name == "Verdant Realm") {
            // Visual changes
            this.map = convertMapToVerdant(this.map);
        }
        if (this.goalComplete)
            this.map = this.map.map(row => row.replace("√", "#"));
        let unlockedBarriers = getRealm("Compounding Realm").machineCompletions;
        for (let i = 0; i < 3; i++) {
            if (i > unlockedBarriers)
                this.map = this.map.map(row => row.replace(i.toString(), "█"));
        }
        this.mapLocations.forEach((ml, y) => {
            ml.forEach((l, x) => {
                l.reset();
            });
        });
        this.manaDrain = 0;
    }
    mineComplete() {
        let realm;
        this.manaGain = +(this.manaGain + 0.1).toFixed(2);
        let mana = getStat("Mana");
        mana.base = +(mana.base + 0.1).toFixed(2);
        mana.current += 0.1;
        this.cacheManaGain[currentRealm] += 0.1;
        if (this.index) {
            zones[this.index - 1].mineComplete();
        }
        realm = getRealm("Verdant Realm");
        if (realms[currentRealm].name == "Verdant Realm" && this.index == 0 && realm.mult !== null) {
            realm.mult += 0.0005;
        }
        realm = getRealm("Compounding Realm");
        if (realms[currentRealm].name == "Compounding Realm" && this.index == 0 && realm.mult !== null) {
            realm.mult += 0.05;
            stats
                .filter(s => s.learnable && s.base >= 99 + getRealmMult("Compounding Realm"))
                .forEach(s => {
                s.dirty = true;
                s.update(true);
            });
        }
        this.display();
    }
    exitZone(complete = true) {
        if (complete) {
            // Replace only routes which are strictly worse than an existing one.
            this.lastRoute = new ZoneRoute(this);
            let sameRoute = this.routes.find(r => r.isSame(this.lastRoute));
            if (sameRoute) {
                (sameRoute.mana = this.lastRoute.mana), sameRoute.mana;
                (sameRoute.manaRequired = this.lastRoute.manaRequired), sameRoute.manaRequired;
                sameRoute.stuff = this.lastRoute.stuff;
                sameRoute.require = this.lastRoute.require;
                sameRoute.cloneHealth = this.lastRoute.cloneHealth;
            }
            else if (!this.routes.some(r => r.realm == currentRealm && r.isBetter(this.lastRoute, this.manaGain))) {
                this.routesChanged = true;
                for (let i = 0; i < this.routes.length; i++) {
                    if (this.routes[i].realm != currentRealm)
                        continue;
                    if (this.lastRoute.isBetter(this.routes[i], this.manaGain)) {
                        this.routes.splice(i, 1);
                        i--;
                    }
                }
                this.routes.push(this.lastRoute);
            }
        }
        this.display();
    }
    sumRoute(require, startDamage) {
        let routeOptions = this.routes
            .filter(r => r.realm == currentRealm)
            .filter(r => {
            let reqs = (require || []).map(s => {
                return {
                    name: s.name,
                    count: s.count
                };
            });
            for (let req of reqs) {
                let thing = r.stuff.find(s => s.name == req.name);
                if (!thing || req.count > thing.count) {
                    return false;
                }
            }
            return true;
        })
            .map(r => {
            let health = startDamage.map((h, i) => {
                if (r.cloneHealth[i] === undefined)
                    return h;
                return Math.max(h + r.cloneHealth[i][1], 0) + r.cloneHealth[0][0];
            });
            let effectiveMana = r.mana + (Math.floor(r.stuff.find(s => s.name == "Gold Nugget")?.count || 0) * (GOLD_VALUE * getRealmMult("Verdant Realm", true) - 1 / clones.length));
            let result = [r, r.require, health, effectiveMana];
            return result;
        });
        return routeOptions.sort((a, b) => b[3] - a[3]);
    }
    enterZone() {
        this.display();
        let zoneSelect = document.querySelector("#zone-select");
        if (zoneSelect === null)
            throw new Error("No zone select found");
        let currentActiveZone = zoneSelect.querySelector(".active-zone");
        if (currentActiveZone)
            currentActiveZone.classList.remove("active-zone");
        zoneSelect.children[currentZone].classList.add("active-zone");
        if (this.name == "Zone 2" && getMessage("Enter New Zone").display()) {
            if (settings.running)
                toggleRunning();
        }
        if (this.name == "Zone 7" && getMessage("Game Slowdown").display()) {
            if (settings.running)
                toggleRunning();
        }
        let mana = getStat("Mana");
        mana.current += this.manaGain;
        mana.base += this.manaGain;
        mana.min = mana.current;
        this.startMana = mana.current;
        this.zoneStartTime = queueTime;
        queues = this.queues;
        queues.forEach((_, i) => {
            resetQueueHighlight(i);
        });
        clones.forEach(c => c.enterZone());
        redrawQueues();
        isDrawn = false;
        this.getMapLocation(0, 0);
        this.mapLocations.forEach((ml, y) => {
            ml.forEach((l, x) => {
                mapDirt.push([x, y]);
            });
        });
        if (this.name != "Zone 1") {
            skipActionComplete = true;
        }
        this.startStuff = stuff
            .filter(s => s.count > 0)
            .map(s => {
            s.resetMin();
            return {
                name: s.name,
                count: s.count
            };
        });
    }
    display() {
        while (this.queues.length < clones.length) {
            let q = new ActionQueue();
            q.index = this.queues.length;
            this.queues.push(q);
        }
        if (!this.node) {
            const zoneTemplate = document.querySelector("#zone-template");
            if (zoneTemplate === null)
                throw new Error("No zone template found");
            this.node = zoneTemplate.cloneNode(true);
            this.node.removeAttribute("id");
            let zoneSelect = document.querySelector("#zone-select");
            if (zoneSelect === null)
                throw new Error("No zone select found");
            zoneSelect.appendChild(this.node);
        }
        if (currentZone == displayZone) {
            document.querySelector("#zone-name").innerHTML = this.name;
            setTimeout(() => showFinalLocation());
        }
        // Scroll queues so that there isn't a huge amount of blank queue displayed (especially when it shouldn't scroll)
        queues.forEach((q, i) => scrollQueue(i, 0));
        this.node.querySelector(".name").innerHTML = this.name;
        this.node.querySelector(".mana").innerHTML = `+${this.manaGain}`;
        this.node.onclick = () => {
            document.querySelector("#zone-name").innerHTML = this.name;
            displayZone = zones.findIndex(z => z.name == this.name);
            clearCursors();
            isDrawn = false;
            mapDirt = [];
            mapStain = [];
            drawMap();
            redrawQueues();
        };
        if (this.routesChanged) {
            let parent = this.node.querySelector(".routes");
            if (parent === null)
                throw new Error("Routes element not found");
            while (parent.lastChild) {
                parent.removeChild(parent.lastChild);
            }
            let head = document.createElement("h4");
            head.innerHTML = "Routes (click to load, ctrl-click here to clear unused routes):";
            head.onclick = this.clearRoutes.bind(this);
            parent.appendChild(head);
            let routeTemplate = document.querySelector("#zone-route-template");
            if (routeTemplate === null)
                throw new Error("No route template found");
            parent.style.display = this.routes.some(r => r.realm == currentRealm) ? "block" : "none";
            let usedRoutes = findUsedZoneRoutes();
            for (let i = 0; i < this.routes.length; i++) {
                if (this.routes[i].realm != currentRealm)
                    continue;
                let routeNode = routeTemplate.cloneNode(true);
                routeNode.removeAttribute("id");
                if (this.routes[i].actionCount)
                    routeNode.querySelector(".actions").innerHTML = this.routes[i].actionCount.toString() + "&nbsp;";
                routeNode.querySelector(".mana").innerHTML = this.routes[i].mana.toFixed(2);
                displayStuff(routeNode, this.routes[i]);
                routeNode.onclick = () => {
                    this.routes[i].loadRoute(this);
                    parent.querySelectorAll("div.active").forEach(node => node.classList.remove("active"));
                    routeNode.classList.add("active");
                };
                routeNode.title = "";
                routeNode.querySelector(".delete-route-inner").onclick = this.deleteRoute.bind(this, i);
                if (!usedRoutes.includes(this.routes[i])) {
                    routeNode.classList.add("unused");
                    routeNode.title += "This route is not used for any saved route. ";
                }
                if (this.index > 0 && !zones[this.index - 1].sumRoute(this.routes[i].require, this.routes[i].cloneHealth.map(c => c[0])).length) {
                    routeNode.classList.add("orphaned");
                    routeNode.title += "This route has no valid predecessor. ";
                }
                parent.appendChild(routeNode);
            }
            let foot = document.createElement("h4");
            foot.innerHTML = "Legend:";
            parent.appendChild(foot);
            let leg1 = document.createElement("h4");
            leg1.classList.add("route-legend");
            leg1.classList.add("active");
            leg1.innerHTML = "Active";
            parent.appendChild(leg1);
            let leg2 = document.createElement("h4");
            leg2.classList.add("route-legend");
            leg2.classList.add("unused");
            leg2.innerHTML = "Unused";
            parent.appendChild(leg2);
            let leg3 = document.createElement("h4");
            leg3.classList.add("route-legend");
            leg3.classList.add("orphaned");
            leg3.innerHTML = "Orphaned";
            parent.appendChild(leg3);
            this.routesChanged = false;
        }
        this.displaySelectedRoute();
    }
    displaySelectedRoute() {
        if (this.node === null)
            throw new Error("Missing display node");
        let parent = this.node.querySelector(".routes");
        if (parent === null)
            throw new Error("Routes element not found");
        parent.querySelectorAll("div.active").forEach(node => node.classList.remove("active"));
        let currentRoute = (this.queues + "").replace(/(^|,)(.*?),\2(,|$)/, "$1");
        this.routes
            .filter(r => r.realm == currentRealm)
            .forEach((r, i) => {
            if ((r.route + "").replace(/(^|,)(.*?),\2(,|$)/, "$1") == currentRoute && parent.children[i + 1])
                parent.children[i + 1].classList.add("active");
        });
    }
    clearRoutes(event) {
        if (!event.ctrlKey && !event.metaKey)
            return;
        if (settings.warnings && !confirm(`Really delete unused routes?`))
            return;
        clearUnusedZoneRoutes(this.index);
    }
    deleteRoute(index, event) {
        this.routes.splice(index, 1);
        markRoutesChanged();
        this.display();
        event.stopPropagation();
    }
    completeGoal() {
        if (this.goalComplete || this.goalReward === null)
            return;
        this.goalComplete = true;
        this.goalReward();
    }
    tick(time) {
        // Optimize by keeping a list of watery locations?
        this.mapLocations.forEach(row => row.forEach(loc => loc.zoneTick(time)));
        if (this.manaDrain) {
            let drainValue = time * this.manaDrain * getStat("Chronomancy").value;
            getStat("Mana").spendMana(drainValue / 1000);
            if (!loopActions["Barrier Drain"])
                loopActions["Barrier Drain"] = Array(zones.length).fill(0);
            loopActions["Barrier Drain"][this.index] += drainValue * clones.length;
        }
    }
}
function markRoutesChanged() {
    zones.forEach(z => (z.routesChanged = true));
}
function moveToZone(zone, complete = true) {
    if (typeof zone == "string") {
        zone = zones.findIndex(z => z.name == zone);
    }
    if (!zones[zone]) {
        settings.running = false;
        return;
    }
    zones[currentZone].exitZone(complete);
    if (currentZone == displayZone && settings.followZone) {
        displayZone = zone;
        clearCursors();
    }
    currentZone = zone;
    zones[zone].enterZone();
}
function recalculateMana() {
    zones.forEach(z => (z.manaGain = 0));
    zones.forEach((z, i) => {
        z.manaGain = z.mapLocations
            .flat()
            .filter(l => l.type.name == "Mana-infused Rock")
            .reduce((a, c) => a + c.priorCompletions, 0);
        z.manaGain /= 10;
        for (let j = 0; j < i; j++) {
            zones[j].manaGain += z.manaGain;
        }
    });
    zones.forEach(z => {
        z.manaGain = +z.manaGain.toFixed(2);
        if (z.queues && z.mapLocations.some(r => r.some(x => x)))
            z.display();
        z.cacheManaGain[currentRealm] = z.manaGain;
    });
}
const zones = [
    new Zone("Zone 1", [
        "█████████████████████",
        "███████+##+██████████",
        "██####% █████%███████",
        "██%██#█##%█¢#♠♥██████",
        "███###███¤██#███¤♣███",
        "██+♠████%♠%█#╬███#███",
        "█¤█+██.###♠=#⎶█☼█#███",
        "█%##███#+█#+##█%##███",
        "███###█¤██##█♠███+███",
        "███#█#██¤♠ ♠█++██#███",
        "█#  █#████♠♣█████#███",
        "█♠███#████+♠♣♠██  2#█",
        "█♠%█#####+███♣1# ██#█",
        "█#%█+##██#####████##█",
        "█#%█##♠#%████ Θ██☼#+█",
        "██%███#█#%#██████+¤+█",
        "█¤#¥██++██#£░╖√██████",
        "█████████████████████",
    ], () => {
        getMessage("Unlocked Duplication Rune").display();
        getRune("Duplication").unlock();
    }),
    new Zone("Zone 2", [
        "███████████████████",
        "█¥#¢███████████████",
        "██%██████████#+█ ¤█",
        "█╖○█%#+██+#█╬#██ ██",
        "█♣%█%█¤██###%#%)+#█",
        "█♣██%#««█%█+█████¤█",
        "█«█████«███ █##♥███",
        "█«~1+#█%#█¤#█=█#%██",
        "█╖███#██##♠#####███",
        "█++█##%█+██.███##██",
        "██¤█+#%██████¤██%#█",
        "██2███%«««%+#♣««g#█",
        "██#█+████████ ██##█",
        "█##█+########√#████",
        "█c████████████###^█",
        "█○○██¤█%█###████#██",
        "██¤█Θ+«%#«█««««««██",
        "███████████████████",
    ], () => {
        getMessage("Unlocked Weaken Rune").display();
        getRune("Weaken").unlock();
    }),
    new Zone("Zone 3", [
        "████████████████████",
        "████+█████%█%%███++█",
        "███«««████¤██%+█¤█+█",
        "██¤+█«+█¤█+%█#+█#█|█",
        "█+██=«gg⎶█g██##█s█♣█",
        "█%%██.████♣▣█#♥█#█#█",
        "█♣%%%%╬██+####██#█#█",
        "█♣█ ██[#█+███#(█###█",
        "█+█ ███~#%█^█#███2██",
        "█###░√█████♠█#1   ██",
        "█+███&+]██Θc##███«██",
        "█#█████##██#█#+█««☼█",
        "█#♠#%%██+█+#██#█«███",
        "██#██%██#██░█%%█««██",
        "█%#+█%○█##█¤█%%█░○██",
        "██+¤█████████%██¤£██",
        "████████████████████",
    ], () => {
        getMessage("Unlocked Wither Rune").display();
        getRune("Wither").unlock();
    }),
    new Zone("Zone 4", [
        "███████████████████",
        "██§§¤█.╖╖√++█«█«%«█",
        "██§███α████+█¤█%«▣█",
        "██§█+█╖█++███~█«%%█",
        "██§█««♣««███+~█%««█",
        "█§§█=█α█%█¤█«██«%«█",
        "█§████«███««««+«█╖█",
        "█2██&+«╖¤██«█████○█",
        "█#|███«███⎶ █«α«+«█",
        "█#██%««♣««++█α█+█{█",
        "█%██○██«█████«α████",
        "█%¤███««c««███¤█╖Θ█",
        "█ ██╬««███╖««███╖██",
        "█ ████}█+███c█«««██",
        "█ ██^███♠♠♠+α+«████",
        "█ m1+++♠♠████¤█████",
        "███████████████████",
    ], () => {
        getMessage("Other Realms").display();
        realms[0].unlock();
        realms[1].unlock();
    }),
    new Zone("Zone 5", [
        "███████████████████",
        "███████++█+#««█████",
        "█████¤~+♣#++█«█████",
        "█%█+███++████12 ███",
        "█+0.╖█████«0╖√█ ███",
        "█%██╖█=█¤█«████ ███",
        "████«««««««█¤♠█ ███",
        "██««««««««███♠█ ███",
        "██«««█0«««««♠♠█ ███",
        "██«««██«««««█+█ ███",
        "██«««««««██«███ ███",
        "█««««««█««█«███ ███",
        "█«██««««««««+██ %%█",
        "█+█0«███«««████%%%█",
        "█%«█«s«█+████Θ█%%%█",
        "██«██0«████««╖█¤███",
        "██+███s«««««███████",
        "██~~~¤██¤██████████",
        "███████████████████",
    ], () => {
        getMessage("Further Realms").display();
        realms[2].unlock();
    }),
    new Zone("Zone 6", [
        "████████████████",
        "█%██╬█=███¤█%%+█",
        "█%%█%█ ██  █%███",
        "██ %§%. █ █§%§██",
        "████%██║    █%██",
        "█+%§ % ██████%♥█",
        "█%█%██ █%%%  ███",
        "██+%%█%%§███  +█",
        "████%███%%+██ +█",
        "█§§§§█╣Θ█████ ██",
        "█+████ ███%%§ ¤█",
        "█%%██  █¤§██%███",
        "██++█ ███╖╖╖%§§█",
        "█+++█     ████~█",
        "███╖████ ^████~█",
        "███╖╖╖╖~╣██√╣╖~█",
        "█¤██████1███████",
        "█╖%>█   ~████+¤█",
        "█%%╖§ ████[█++██",
        "██%<█2█╖  m+++██",
        "█████╖╖╖██]█████",
        "████████████████",
    ], () => {
        getMessage("Unlocked Teleport Runes").display();
        getRune("Teleport To").unlock();
        getRune("Teleport From").unlock();
    }),
    new Zone("Zone 7", [
        "██████████████████",
        "█«««««██████¤█████",
        "█+███«█☼████╬█████",
        "█+«~~««♣██¤█§╣%███",
        "█++████«█╖╖█§§████",
        "███ Θ██╖╖ ██§╣%███",
        "██m ██☼█○§██§█████",
        "█^+██╖§█§§§§§╣(█¤█",
        "██╖+¤m╖╖.███████}█",
        "██+██╖§█♣╖███╖=█{█",
        "██╣██████╖█▣╖╖██♣█",
        "█0~╣█████╖██╖███ █",
        "███╣██☼╖╖♣♣╖♣╖██ █",
        "██√§███╖██╖██╖██ █",
        "██████+╖██╖██╖+█2█",
        "██+╖╖╖♣█+╖♣╖+█1█¤█",
        "████+█████+███ ╖╖█",
        "████████████████)█",
        "██████████████████",
    ], () => {
        getMessage("Compounding Realm").display();
        realms[3].unlock();
    }),
    new Zone("Zone 8", [
        "████████████████",
        "████████████████",
        "████████████████",
        "████████████████",
        "████████████████",
        "███████¤+=██████",
        "████████+███████",
        "███████#G#██████",
        "███████♣.♣██████",
        "████████████████",
        "████████████████",
        "████████████████",
        "████████████████",
        "████████████████",
        "████████████████",
        "████████████████",
        "████████████████",
        "████████████████",
        "████████████████",
    ], () => { })
];
//# sourceMappingURL=zones.js.map