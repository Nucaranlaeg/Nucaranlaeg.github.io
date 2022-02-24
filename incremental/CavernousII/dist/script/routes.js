"use strict";
let currentRoutes = [];
class Route {
    constructor(base) {
        this.actionCount = 0;
        this.cachedEstimate = 0;
        this.goldVaporized = [0, 0];
        this.loadingFailed = false;
        this.manaDrain = 0;
        this.needsNewEstimate = true;
        this.usedRoutes = null;
        if (base instanceof MapLocation) {
            this.x = base.x;
            this.y = base.y;
            this.zone = currentZone;
            this.realm = currentRealm;
            this.actionCount = realms[this.realm].name == "Compounding Realm" ? loopCompletions : 0;
            this.manaDrain = zones[currentZone].manaDrain;
            this.goldVaporized = loopGoldVaporized;
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
            this.cloneArriveTimes = clones.filter(c => c.x == this.x && c.y == this.y).map(c => queueTime);
            this.allDead = false;
            this.invalidateCost = false;
            this.estimateRefineManaLeft();
            return;
        }
        Object.assign(this, base);
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
    loadRoute(turnOffAuto = false) {
        if (turnOffAuto) {
            if (settings.grindStats)
                toggleGrindStats();
            if (settings.grindMana)
                toggleGrindMana();
        }
        let success = true;
        if (this.zone > 0) {
            if (this.invalidateCost)
                this.usedRoutes = null;
            let stime = Date.now();
            let routes = this.pickRoute(this.zone - 1, this.require, this.cloneHealth);
            markRoutesChanged();
            this.usedRoutes = routes;
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
        if (!success)
            return false;
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
        return true;
    }
    updateRoute() {
        this.manaDrain = zones[currentZone].manaDrain;
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
        // cloneHealth is [min (from start), delta]
        this.cloneHealth = clones.map(c => c.minHealth);
        this.require = zones[currentZone].startStuff.map(s => {
            return {
                "name": s.name,
                "count": s.count - getStuff(s.name).min,
            };
        }).filter(s => s.count > 0);
        const arrivedClones = clones.filter(c => c.x == this.x && c.y == this.y).length;
        while (arrivedClones > this.cloneArriveTimes.length) {
            this.cloneArriveTimes.push(queueTime);
        }
        this.needsNewEstimate = true;
    }
    getRefineCost(relativeLevel = 0) {
        let loc = getMapLocation(this.x, this.y, true, this.zone);
        if (!loc)
            return Infinity;
        let mul = getAction("Collect Mana").getBaseDuration(this.realm) * (1 + this.manaDrain);
        if (realms[this.realm].name == "Compounding Realm") {
            mul /= 1 + loopCompletions / 40;
            mul *= 1 + this.actionCount / 40;
        }
        return mineManaRockCost(loc, null, this.realm, loc.completions + loc.priorCompletionData[this.realm] + relativeLevel) * mul;
    }
    estimateRefineManaLeft(current = false, ignoreInvalidate = false) {
        if (!this.needsNewEstimate && this.cachedEstimate)
            return !ignoreInvalidate && this.invalidateCost ? this.cachedEstimate + 1e9 : this.cachedEstimate;
        this.needsNewEstimate = false;
        const manaMult = getRealmMult("Verdant Realm") || 1;
        const manaTotal = 5 + zones.reduce((a, z, i) => {
            return i > this.zone ? a : a + z.cacheManaGain[this.realm];
        }, 0) + (current ? this.goldVaporized[0] * GOLD_VALUE * manaMult : this.goldVaporized[1]);
        const totalRockTime = this.cloneArriveTimes.reduce((a, c) => a + (manaTotal - (c / 1000)), 0);
        const rockCost = this.getRefineCost();
        const magic = getStat("Magic").base;
        const finalMagic = magic + (totalRockTime + this.goldVaporized[0]) / 10;
        let estimate = totalRockTime - rockCost / (((magic + finalMagic) / 2 + 100) / 100);
        estimate /= this.cloneArriveTimes.length;
        this.cachedEstimate = estimate;
        return !ignoreInvalidate && this.invalidateCost ? estimate + 1e9 : estimate;
    }
    estimateRefineTimes() {
        let times = 0;
        let currentLeft = this.estimateRefineManaLeft(false, true);
        let currentCost = this.getRefineCost(times);
        let nextDiff = 0;
        while (currentLeft + 0.1 * times * (this.zone + 1) > nextDiff) {
            nextDiff = (this.getRefineCost(++times) - currentCost) / this.cloneArriveTimes.length;
            if (nextDiff == 0)
                return 0;
        }
        return times;
    }
    static updateBestRoute(location, completed = false) {
        let cur = currentRoutes.find(r => r.x == location.x && r.y == location.y && r.zone == currentZone);
        let prev = Route.getBestRoute(location.x, location.y, currentZone);
        if (cur === undefined) {
            cur = new Route(location);
            currentRoutes.push(cur);
        }
        else {
            cur.updateRoute();
        }
        if (prev == cur && !completed)
            return cur;
        if (prev) {
            let curEff = cur.estimateRefineManaLeft(true);
            let prevEff = prev.estimateRefineManaLeft();
            if (curEff < prevEff && !(prev.invalidateCost || completed) && prev.route.join(",") != cur.route.join(",")) {
                return prev;
            }
            routes = routes.filter(e => e != prev);
        }
        routes.push(cur);
        routes = routes.filter((r, i) => routes.findIndex(R => R.x == r.x && R.y == r.y && R.zone == r.zone && R.realm == r.realm) == i).map(r => new Route(r));
        markRoutesChanged();
        return cur;
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
        });
        return ar;
    }
    static fromJSON(ar) {
        ar = this.migrate(ar);
        return ar.filter((r, i) => ar.findIndex(R => R.x == r.x && R.y == r.y && R.zone == r.zone && R.realm == r.realm) == i).map(r => new Route(r));
    }
    static loadBestRoute() {
        let effs = routes.map(r => {
            if (r.realm != currentRealm || r.allDead)
                return null;
            return [r.estimateRefineManaLeft() + (+r.loadingFailed * -1e8), r];
        }).filter((r) => r !== null)
            .sort((a, b) => b[0] - a[0]);
        for (let i = 0; i < effs.length; i++) {
            if (effs[i][1].loadRoute())
                return;
        }
    }
    static invalidateRouteCosts() {
        routes.filter(r => r.realm == currentRealm).forEach(r => r.invalidateCost = true);
    }
    showOnLocationUI() {
        document.querySelector("#location-route").hidden = false;
        document.querySelector("#route-has-route").hidden = false;
        document.querySelector("#route-not-visited").hidden = true;
        let est = this.estimateRefineManaLeft();
        const manaMult = getRealmMult("Verdant Realm") || 1;
        let manaTotal = 5 + zones.reduce((a, z, i) => {
            return i > this.zone ? a : a + z.cacheManaGain[this.realm];
        }, 0) + this.goldVaporized[0] * GOLD_VALUE * manaMult - this.goldVaporized[1];
        document.querySelector("#route-best-time").innerText = writeNumber(manaTotal - est, 1);
        document.querySelector("#route-best-mana-left").innerText = est.toFixed(2);
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
    }
    deleteRoute() {
        routes = routes.filter(r => r != this);
        showFinalLocation();
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
        bestRoute.loadRoute();
    document.activeElement?.blur();
}
function updateGrindStats() {
    let rockCounts = realms
        .filter(r => (!r.locked && !r.completed) || r.name == "Core Realm")
        .map((r, realm_i) => zones
        .filter(z => z.mapLocations.flat().length)
        .map((z, zone_i) => routes
        .filter(t => t.zone == zone_i && t.realm == realm_i)
        .reduce((a, t) => a + (t.allDead ? 0.000005 : t.loadingFailed ? 0.005 : t.estimateRefineTimes()), 0)));
    let reachedCounts = realms
        .filter(r => (!r.locked && !r.completed) || r.name == "Core Realm")
        .map((r, realm_i) => zones
        .filter(z => z.mapLocations.flat().length)
        .map((z, zone_i) => z.mapLocations.flat().filter(l => l.type.name == "Mana-infused Rock").length !=
        routes.filter(t => t.zone == zone_i && t.realm == realm_i).length));
    let revisitCounts = realms
        .filter(r => (!r.locked && !r.completed) || r.name == "Core Realm")
        .map((r, realm_i) => zones
        .filter(z => z.mapLocations.flat().length)
        .map((z, zone_i) => routes.filter(t => t.zone == zone_i && t.realm == realm_i && t.invalidateCost && !t.allDead).length));
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
    for (let i = 0; i < rockCounts.length; i++) {
        let headerNode = cellTemplate.cloneNode(true);
        headerNode.removeAttribute("id");
        headerNode.innerHTML = realms[i].name.replace(/ Realm/, "");
        header.appendChild(headerNode);
        let footerNode = cellTemplate.cloneNode(true);
        footerNode.removeAttribute("id");
        footerNode.innerHTML = rockCounts[i].reduce((a, c) => a + Math.floor(c)).toString();
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
            rowNode.appendChild(cellNode);
        }
        body.appendChild(rowNode);
    }
}
let routes = [];
//# sourceMappingURL=routes.js.map