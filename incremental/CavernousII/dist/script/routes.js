"use strict";
let currentRoutes = [];
class Route {
    constructor(base) {
        this.actionCount = 0;
        this._cachedEstimate = 0;
        this.chronoMult = 1;
        this.drainLoss = 0;
        this.goldVaporized = [0, 0];
        this.hasAttempted = false;
        this.loadingFailed = false;
        this.log = null;
        this.manaDrain = 0;
        this.needsNewEstimate = true;
        this.noGrind = false;
        this.usedRoutes = null;
        if (base instanceof MapLocation) {
            this.x = base.x;
            this.y = base.y;
            this.zone = currentZone;
            this.realm = currentRealm;
            this.actionCount = realms[this.realm].name == "Compounding Realm" ? loopCompletions : 0;
            this.manaDrain = zones[currentZone].manaDrain;
            this.log = currentLoopLog;
            this.goldVaporized = [this.log.goldVaporizedCount, this.log.goldVaporizedMana];
            let route = zones[currentZone].queues.map(r => queueToString(r));
            route = route.filter(e => e.length);
            if (route.every((e, i, a) => e == a[0])) {
                route = [route[0]];
            }
            else {
                let unique = route.find((e, i, a) => a.filter(el => el == e).length == 1);
                let ununique = route.find(e => e != unique);
                if (route.every(e => e == unique || e == ununique) && unique && ununique) {
                    route = [unique, ununique];
                }
            }
            this.route = route;
            // Route requirements
            // cloneHealth is [min (from start), delta]
            this.cloneHealth = clones.map(c => c.minHealth);
            this.require = zones[currentZone].startStuff.map(s => {
                return {
                    "name": s.name,
                    "count": s.count - getStuff(s.name).min,
                };
            }).filter(s => s.count > 0);
            this.cloneArriveTimes = clones.filter(c => c.x == this.x && c.y == this.y && zones[this.zone].queues[c.id].getNextAction()?.action === "I")
                .map(c => queueTime);
            if (saveName === "saveGameII_separate") {
                this.cloneArriveTimes = [Math.min(...this.cloneArriveTimes)];
            }
            this.drainLoss = totalDrain;
            this.chronoMult = getStat("Chronomancy").value;
            this.allDead = false;
            this.invalidateCost = false;
            this.estimateRefineManaLeft();
            const usedRoutes = zones.slice(0, this.zone).map(z => z.lastRoute ? z.routes.find(r => r.isSame(z.lastRoute)) : null);
            if (usedRoutes.every(r => r))
                this.usedRoutes = usedRoutes;
            return;
        }
        Object.assign(this, base);
        if (this.usedRoutes && this.usedRoutes.length && typeof (this.usedRoutes[0]) == "number") {
            // Populate the usedRoutes
            const usedRoutes = this.usedRoutes.flatMap(id => zones.map(z => z.routes.find(r => r.id == id)).filter(r => r));
            if (usedRoutes.every(r => r))
                this.usedRoutes = usedRoutes;
        }
    }
    set cachedEstimate(value) {
        this._cachedEstimate = value - getBaseMana(this.zone, this.realm);
    }
    get cachedEstimate() {
        return this._cachedEstimate + getBaseMana(this.zone, this.realm);
    }
    isSame(route) {
        if (!route)
            return false;
        return (JSON.stringify(route.route) == JSON.stringify(this.route) &&
            JSON.stringify(route.usedRoutes?.map(r => r.id)) == JSON.stringify(this.usedRoutes?.map(r => r.id)));
    }
    pickRoute(zone, actualRequirements, health = clones.map(c => 0), actionCount = this.actionCount) {
        let routeOptions = zones[zone].sumRoute(actualRequirements, health, actionCount);
        if (zone == 0) {
            if (routeOptions.length == 0)
                return null;
            let health = getStat("Health");
            let route = routeOptions.find(r => r[1].every(s => s.count == 0) && r[2].every(h => Math.abs(h) < health.base + getEquipHealth(r[1]))) || [];
            return route[0] ? [route[0]] : null;
        }
        for (let i = 0; i < routeOptions.length; i++) {
            let routes = this.pickRoute(zone - 1, routeOptions[i][1], routeOptions[i][2], routeOptions[i][0].actionCount);
            if (routes !== null) {
                routeOptions[i][0].noValidPrior = false;
                return [...routes, routeOptions[i][0]];
            }
            routeOptions[i][0].noValidPrior = true;
        }
        return null;
    }
    loadRoute(turnOffAuto = false, forceLastZoneLoad = false) {
        if (turnOffAuto) {
            if (settings.grindStats)
                toggleGrindStats();
            if (settings.grindMana)
                toggleGrindMana();
        }
        let success = true;
        if (this.zone > 0) {
            let routes;
            if (this.usedRoutes && this.usedRoutes.every((r, i) => zones[i].routes.some(zr => zr.id == r.id))) {
                routes = this.usedRoutes;
            }
            else {
                routes = this.pickRoute(this.zone - 1, this.require, this.cloneHealth);
                markRoutesChanged();
                this.usedRoutes = routes;
            }
            if (routes !== null) {
                for (let i = 0; i < routes.length; i++) {
                    routes[i].loadRoute(zones[i], false);
                }
                this.loadingFailed = false;
            }
            else {
                success = false;
                this.loadingFailed = true;
            }
        }
        if (success || forceLastZoneLoad) {
            for (let i = 0; i < zones[this.zone].queues.length; i++) {
                if (i == 0 || this.route.length == 1) {
                    zones[this.zone].queues[i].fromString(this.route[0]);
                }
                else if (this.route.length == 2) {
                    zones[this.zone].queues[i].fromString(this.route[1]);
                }
                else {
                    zones[this.zone].queues[i].fromString(this.route[i] || this.route[this.route.length - 1] || "");
                }
            }
            redrawQueues();
        }
        return success;
    }
    updateRoute() {
        this.manaDrain = zones[currentZone].manaDrain;
        let route = zones[currentZone].queues.map(r => queueToString(r));
        route = route.filter(e => e.length);
        if (this.log.goldVaporizedCount > this.goldVaporized[0]) {
            this.needsNewEstimate = true;
            this.goldVaporized = [this.log.goldVaporizedCount, this.log.goldVaporizedMana];
        }
        if (route.every((e, i, a) => e == a[0])) {
            route = [route[0]];
        }
        else {
            let unique = route.find((e, i, a) => a.filter(el => el == e).length == 1);
            let ununique = route.find(e => e != unique);
            if (route.every(e => e == unique || e == ununique) && unique && ununique) {
                route = [unique, ununique];
            }
        }
        this.route = route;
        // cloneHealth is [min (from start), delta]
        this.cloneHealth = clones.map(c => c.minHealth);
        this.require = zones[currentZone].startStuff.map(s => {
            return {
                "name": s.name,
                "count": s.count - getStuff(s.name).min,
            };
        }).filter(s => s.count > 0);
        const arrivedClones = clones.filter(c => c.x == this.x && c.y == this.y && zones[this.zone].queues[c.id].getNextAction()?.action === "I").length;
        while (arrivedClones > this.cloneArriveTimes.length && saveName !== "saveGameII_separate") {
            this.needsNewEstimate = true;
            this.cloneArriveTimes.push(queueTime);
        }
    }
    getRefineCost(relativeLevel = 0) {
        let loc = getMapLocation(this.x, this.y, true, this.zone);
        if (!loc)
            return Infinity;
        let mul = getAction("Collect Mana").getBaseDuration(this.realm);
        if (realms[this.realm].name == "Compounding Realm") {
            mul /= 1 + loopCompletions / 40;
            mul *= 1 + this.actionCount / 40;
        }
        return mineManaRockCost(loc, null, this.realm, loc.completions + loc.priorCompletionData[this.realm] + relativeLevel) * mul;
    }
    getTotalRockTime(current = false) {
        const manaMult = getRealmMult("Verdant Realm") || 1;
        const manaTotal = getBaseMana(this.zone, this.realm) + (current ? this.goldVaporized[0] * GOLD_VALUE * manaMult : this.goldVaporized[1]);
        const drainMult = (1 + this.manaDrain * this.chronoMult);
        let totalRockTime = this.cloneArriveTimes.reduce((a, c) => a + (manaTotal - (c / 1000)), 0) / drainMult;
        // Remove drain loss before any clone arrived
        totalRockTime -= (this.drainLoss * this.cloneArriveTimes.length);
        // Remove drain loss from time prior to other clones arriving
        const firstCloneArrival = Math.min(...this.cloneArriveTimes);
        const preArrivalTime = this.cloneArriveTimes.reduce((a, c) => a + (c - firstCloneArrival), 0);
        totalRockTime -= preArrivalTime / this.cloneArriveTimes.length * (this.manaDrain * this.chronoMult);
        return totalRockTime;
    }
    estimateMagicAfterVaporizing(gold) {
        // Underestimate rather than overestimate, to avoid the UI giving a "mana left: 0.01" estimate
        // for a rock that fails to complete.
        const baseMagic = getStat("Magic").base;
        const baseDuration = (realms[this.realm].name == "Long Realm" ? 3 : 1);
        const highEstimate = baseMagic + gold * baseDuration * 10 / (100 + baseMagic);
        return baseMagic + gold * baseDuration * 10 / (100 + highEstimate);
    }
    estimateRefineManaLeft(current = false, ignoreInvalidate = false, completed = false) {
        if (!this.needsNewEstimate && this.cachedEstimate)
            return !ignoreInvalidate && this.invalidateCost ? this.cachedEstimate + 1e9 : this.cachedEstimate;
        this.needsNewEstimate = false;
        const totalRockTime = this.getTotalRockTime(current);
        const magic = this.estimateMagicAfterVaporizing(this.goldVaporized[0]);
        const finalMagic = magic + totalRockTime / 10;
        const rockCost = this.getRefineCost(completed ? 1 : 0) / (((magic + finalMagic) / 2 + 100) / 100);
        // Maybe consider gems?
        let estimate = totalRockTime - rockCost;
        estimate /= this.cloneArriveTimes.length;
        // Multiply excess by drain multiplier because the difference is not symmetric
        const drainMult = (1 + this.manaDrain * this.chronoMult);
        if (estimate > 0)
            estimate *= drainMult;
        this.cachedEstimate = estimate;
        return !ignoreInvalidate && this.invalidateCost ? estimate + 1e9 : estimate;
    }
    estimateRefineTimes() {
        let times = 0;
        let currentLeft = this.estimateRefineManaLeft(false, true);
        let currentCost = this.getRefineCost(times);
        const manaTotal = getBaseMana(this.zone, this.realm) + this.goldVaporized[1];
        const totalRockTime = this.cloneArriveTimes.reduce((a, c) => a + (manaTotal - (c / 1000)), 0) / (1 + this.manaDrain / this.chronoMult);
        const magic = this.estimateMagicAfterVaporizing(this.goldVaporized[0]);
        const finalMagic = magic + totalRockTime / 10;
        const magicMod = 1 + ((magic + finalMagic) / 200);
        while (currentLeft + 0.1 * times * (this.zone + 1)
            >
                (this.getRefineCost(times) - currentCost) * (1 + this.manaDrain / this.chronoMult) / this.cloneArriveTimes.length / magicMod) {
            times++;
        }
        return times;
    }
    static updateBestRoute(location, completed = false) {
        if (location.baseType.name !== "Mana-infused Rock")
            return;
        const prev = Route.getBestRoute(location.x, location.y, currentZone);
        let cur = currentRoutes.find(r => r.x == location.x && r.y == location.y && r.zone == currentZone);
        if (cur === undefined) {
            cur = new Route(location);
            if (cur.cloneArriveTimes.length == 0)
                return;
            currentRoutes.push(cur);
            if (prev) {
                prev.needsNewEstimate = true;
                prev.estimateRefineManaLeft();
            }
        }
        else {
            cur.updateRoute();
        }
        if (prev && cur && !completed && !prev.invalidateCost && !cur.needsNewEstimate)
            return;
        if (completed) {
            cur.hasAttempted = false;
            if (prev)
                prev.hasAttempted = false;
        }
        if ((cur == prev || (cur.isSame(prev) && !completed)) && !prev?.invalidateCost && !cur.needsNewEstimate)
            return;
        cur.needsNewEstimate = true;
        if (prev) {
            let curEff = cur.estimateRefineManaLeft(true, false, completed);
            let prevEff = prev.estimateRefineManaLeft();
            if (curEff < prevEff && !(prev.invalidateCost || completed) && prev.route.join(",") != cur.route.join(",")) {
                return prev;
            }
            routes = routes.filter(e => e != prev);
        }
        routes.push(cur);
        routes = routes.filter((r, i) => routes.findIndex(R => R.x == r.x && R.y == r.y && R.zone == r.zone && R.realm == r.realm) == i).map(r => new Route(r));
        markRoutesChanged();
        return;
    }
    static getBestRoute(x, y, z) {
        return routes.find(r => r.x == x && r.y == y && r.zone == z && r.realm == currentRealm);
    }
    static migrate(ar) {
        if (!ar)
            return ar;
        ar.forEach((route) => {
            if (route.requirements) {
                route.require = route.requirements;
                route.requirements = undefined;
            }
            if (!route.cloneArriveTimes) {
                route.cloneArriveTimes = [0];
            }
            // Some routes saved to things which aren't mana rocks.
            if (zones[route.zone].getMapLocation(route.x, route.y, true)?.baseType.name !== "Mana-infused Rock") {
                route.discard = true;
            }
        });
        return ar.filter((route) => !route.discard);
    }
    static fromJSON(ar) {
        ar = this.migrate(ar);
        return ar.filter((r, i) => ar.findIndex(R => R.x == r.x && R.y == r.y && R.zone == r.zone && R.realm == r.realm) == i).map(r => new Route(r));
    }
    static loadBestRoute() {
        let effs = routes.map(r => {
            if (r.realm != currentRealm || r.allDead || r.noGrind)
                return null;
            return [r.estimateRefineManaLeft() + (+r.loadingFailed * -1e8), r];
        }).filter((r) => r !== null)
            .sort((a, b) => {
            if (a[1].hasAttempted && !b[1].hasAttempted)
                return 1;
            if (!a[1].hasAttempted && b[1].hasAttempted)
                return -1;
            return b[0] - a[0];
        });
        for (let i = 0; i < effs.length; i++) {
            if (effs[i][1].loadRoute())
                return;
        }
    }
    static invalidateRouteCosts() {
        routes.filter(r => r.realm == currentRealm).forEach(r => r.invalidateCost = true);
    }
    static resetHasAttempted() {
        routes.filter(r => r.realm == currentRealm).forEach(r => r.hasAttempted = false);
    }
    showOnLocationUI() {
        document.querySelector("#location-route").hidden = false;
        document.querySelector("#route-has-route").hidden = false;
        document.querySelector("#route-not-visited").hidden = true;
        let est = this.estimateRefineManaLeft();
        const manaMult = getRealmMult("Verdant Realm") || 1;
        let manaTotal = getBaseMana(this.zone, this.realm) + this.goldVaporized[0] * GOLD_VALUE * manaMult - this.goldVaporized[1];
        document.querySelector("#route-best-time").innerText = writeNumber(manaTotal - est, 1);
        document.querySelector("#route-best-mana-left").innerText = est > 1e8 ? (est - 1e9).toFixed(2) : est.toFixed(2);
        document.querySelector("#route-best-unminable").hidden = est >= 0;
        document.querySelector("#route-best-minable").hidden = est < 0;
        if (est > 0) {
            let estTimes = this.estimateRefineTimes();
            document.querySelector("#route-best-minable u").innerText = estTimes.toString();
            document.querySelector("#route-best-minable span").hidden = false;
        }
        document.querySelector("#route-best-invalidated").hidden = !this.invalidateCost;
        document.querySelector("#x-loc").value = this.x.toString();
        document.querySelector("#y-loc").value = this.y.toString();
        displayStuff(document.querySelector("#route-requirements"), this);
        document.querySelector("#failed-route").style.display = this.loadingFailed ? "block" : "none";
        document.querySelector("#dead-route").style.display = this.allDead ? "block" : "none";
        document.querySelector("#delete-route-button").onclick = this.deleteRoute.bind(this);
        const noGrindButton = document.querySelector("#nogrind-button");
        noGrindButton.onclick = this.setNoGrind.bind(this, noGrindButton);
        if (this.noGrind) {
            noGrindButton.classList.add("dontgrind");
            noGrindButton.innerHTML = "Not grinding";
        }
        else {
            noGrindButton.classList.remove("dontgrind");
            noGrindButton.innerHTML = "Grinding";
        }
    }
    deleteRoute() {
        routes = routes.filter(r => r != this);
        showFinalLocation();
    }
    setNoGrind(noGrindButton) {
        this.noGrind = !this.noGrind;
        if (this.noGrind) {
            noGrindButton.classList.add("dontgrind");
            noGrindButton.innerHTML = "Not grinding";
        }
        else {
            noGrindButton.classList.remove("dontgrind");
            noGrindButton.innerHTML = "Grinding";
        }
    }
}
function getBestRoute(x, y, z) {
    return routes.find(r => r.x == x && r.y == y && r.zone == z && r.realm == currentRealm);
}
function loadRoute() {
    let x = +document.querySelector("#x-loc").value;
    let y = +document.querySelector("#y-loc").value;
    let bestRoute = getBestRoute(x, y, displayZone);
    if (bestRoute)
        bestRoute.loadRoute(false, true);
    document.activeElement?.blur();
}
function updateGrindStats() {
    let rockCounts = realms
        .filter(r => (!r.locked && !r.completed) || r.name == "Core Realm")
        .map(r => zones
        .filter(z => z.mapLocations.flat().length)
        .map((z, zone_i) => routes
        .filter(t => t.zone == zone_i && t.realm == r.index)
        .reduce((a, t) => a + (t.allDead ? 0.000005 : t.loadingFailed ? 0.005 : t.estimateRefineTimes()), 0)));
    let reachedCounts = realms
        .filter(r => (!r.locked && !r.completed) || r.name == "Core Realm")
        .map(r => zones
        .filter(z => z.mapLocations.flat().length)
        .map((z, zone_i) => z.mapLocations.flat().filter(l => l.type.name == "Mana-infused Rock").length !=
        routes.filter(t => t.zone == zone_i && t.realm == r.index).length));
    let revisitCounts = realms
        .filter(r => (!r.locked && !r.completed) || r.name == "Core Realm")
        .map(r => zones
        .filter(z => z.mapLocations.flat().length)
        .map((z, zone_i) => routes.filter(t => t.zone == zone_i && t.realm == r.index && t.invalidateCost && !t.allDead).length));
    let skippedCounts = realms
        .filter(r => (!r.locked && !r.completed) || r.name == "Core Realm")
        .map(r => zones
        .filter(z => z.mapLocations.flat().length)
        .map((z, zone_i) => routes.filter(t => t.zone == zone_i && t.realm == r.index && t.noGrind).length));
    const header = document.querySelector("#grind-stats-header");
    const body = document.querySelector("#grind-stats");
    const footer = document.querySelector("#grind-stats-footer");
    let rowTemplate = document.querySelector("#grind-row-template");
    let cellTemplate = document.querySelector("#grind-cell-template");
    if (!rockCounts)
        return;
    while (header.firstChild) {
        header.removeChild(header.lastChild);
        footer.removeChild(footer.lastChild);
    }
    let headerNode = cellTemplate.cloneNode(true);
    headerNode.removeAttribute("id");
    header.appendChild(headerNode);
    let footerNode = cellTemplate.cloneNode(true);
    footerNode.removeAttribute("id");
    footerNode.innerHTML = "Total";
    footer.appendChild(footerNode);
    while (body.firstChild) {
        body.removeChild(body.lastChild);
    }
    let completedRealms = 0;
    for (let i = 0; i < rockCounts.length + completedRealms; i++) {
        if (realms[i].completed) {
            completedRealms++;
            continue;
        }
        let headerNode = cellTemplate.cloneNode(true);
        headerNode.removeAttribute("id");
        headerNode.innerHTML = realms[i].name.replace(/ Realm/, "");
        header.appendChild(headerNode);
        let footerNode = cellTemplate.cloneNode(true);
        footerNode.removeAttribute("id");
        footerNode.innerHTML = rockCounts[i - completedRealms].reduce((a, c) => a + Math.floor(c)).toString();
        footer.appendChild(footerNode);
    }
    for (let i = 0; i < rockCounts[0].length; i++) {
        let rowNode = rowTemplate.cloneNode(true);
        rowNode.removeAttribute("id");
        let cellNode = cellTemplate.cloneNode(true);
        cellNode.removeAttribute("id");
        cellNode.innerHTML = `z${i + 1}`;
        rowNode.appendChild(cellNode);
        for (let j = 0; j < rockCounts.length; j++) {
            let cellNode = cellTemplate.cloneNode(true);
            cellNode.removeAttribute("id");
            cellNode.innerHTML = Math.floor(rockCounts[j][i]).toString();
            if (rockCounts[j][i] % 1 > 0.001) {
                cellNode.classList.add("failed");
            }
            if (rockCounts[j][i] * 1000 % 1 > 0.001) {
                cellNode.classList.add("drowned");
            }
            if (reachedCounts[j][i]) {
                cellNode.classList.add("unreached");
            }
            if (revisitCounts[j][i]) {
                cellNode.classList.add("revisit");
            }
            if (skippedCounts[j][i]) {
                cellNode.classList.add("skipped");
            }
            rowNode.appendChild(cellNode);
        }
        body.appendChild(rowNode);
    }
}
let routes = [];
//# sourceMappingURL=routes.js.map