"use strict";
class ZoneRoute {
    constructor(z) {
        if (z instanceof Zone) {
            let route = queues.map((r, i) => queueToString(r));
            route = route.filter(e => e.length);
            this.realm = currentRealm;
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
            let mana = getStat("Mana");
            this.mana = mana.current - z.startMana;
            this.stuff = stuff
                .filter(s => s.count > 0)
                .map(s => {
                return {
                    name: s.name,
                    count: s.count,
                };
            })
                .filter(s => s.count > 0);
            // cloneHealth is [min (from start), delta]
            this.cloneHealth = clones.map(c => [c.minHealth, c.startDamage - c.damage]);
            this.manaRequired = z.startMana - mana.min;
            this.require = z.startStuff
                .map(s => {
                return {
                    name: s.name,
                    count: s.count,
                };
            })
                .filter(s => s.count > 0);
            this.actionCount = realms[this.realm].name == "Compounding Realm" ? loopCompletions : 0;
            return;
        }
        Object.assign(this, z);
    }
    isBetter(zoneRoute, zoneMana = 0.1) {
        return (this.mana >= zoneRoute.mana - 0.1 &&
            this.manaRequired <= zoneRoute.manaRequired + zoneMana &&
            zoneRoute.stuff.every(s => (this.stuff.find(t => t.name == s.name) || { count: -1 }).count >= s.count) &&
            this.require.every(s => (zoneRoute.require.find(t => t.name == s.name) || { count: -1 }).count >= s.count) &&
            this.cloneHealth.every((c, i) => c[0] > (zoneRoute.cloneHealth[i] || [0])[0] - 0.1 && c[1] > (zoneRoute.cloneHealth[i] || [0, 0])[1] - 0.1) &&
            this.actionCount <= zoneRoute.actionCount);
    }
    isSame(zoneRoute) {
        return (this.realm == zoneRoute.realm &&
            this.route.length == zoneRoute.route.length &&
            this.route.every((r, i) => r == zoneRoute.route[i]) &&
            // ts is really bad at arrays which hold multiple incompatible types.
            Object.entries(this.require).every(([key, value]) => zoneRoute.require[key].name == value.name && zoneRoute.require[key].count == value.count));
    }
    pickRoute(zone, actualRequirements, health = clones.map(c => 0), actionCount = this.actionCount) {
        let routeOptions = zones[zone].sumRoute(actualRequirements, health, actionCount);
        if (zone == 0) {
            if (routeOptions.length == 0)
                return null;
            let health = getStat("Health");
            let route = routeOptions.find(r => r[1].every(s => s.count == 0) && r[2].every(h => h < health.base)) || [];
            return route[0] ? [route[0]] : null;
        }
        for (let i = 0; i < routeOptions.length; i++) {
            let routes = this.pickRoute(zone - 1, routeOptions[i][1], routeOptions[i][2]);
            if (routes !== null) {
                return [...routes, routeOptions[i][0]];
            }
        }
        return null;
    }
    loadRoute(zone, cascade = true) {
        let actualCurrentZone = currentZone;
        currentZone = zone.index;
        for (let i = 0; i < zone.queues.length; i++) {
            if (i == 0 || this.route.length == 1) {
                zone.queues[i].fromString(this.route[0]);
            }
            else if (this.route.length == 2) {
                zone.queues[i].fromString(this.route[1]);
            }
            else {
                zone.queues[i].fromString(this.route[i] || this.route[this.route.length - 1] || "");
            }
        }
        currentZone = actualCurrentZone;
        zone.displaySelectedRoute();
        if (settings.loadPrereqs && zone.index > 0 && cascade) {
            let routes = this.pickRoute(zone.index - 1, this.require, this.cloneHealth.map(c => c[0]));
            if (routes !== null) {
                for (let i = 0; i < routes.length; i++) {
                    routes[i].loadRoute(zones[i]);
                }
            }
        }
        return this.require;
    }
    static fromJSON(ar) {
        return ar.map((r) => new ZoneRoute(r));
    }
}
function findUsedZoneRoutes(breakCache = false) {
    let usedZoneRoutes = [];
    [...routes, ...grindRoutes].forEach(route => {
        if (route.zone == 0 || route.realm != currentRealm)
            return;
        let used;
        if (!breakCache && route.usedRoutes && route.usedRoutes.every((r, i) => zones[i].routes.some(route => r == route))) {
            used = route.usedRoutes;
        }
        else {
            used = route.pickRoute(route.zone - 1, route.require, route.cloneHealth);
            route.usedRoutes = used;
            if (used === null) {
                route.loadingFailed = true;
                return;
            }
            else {
                route.loadingFailed = false;
            }
        }
        used.forEach((r) => {
            if (!usedZoneRoutes.includes(r)) {
                usedZoneRoutes.push(r);
            }
        });
    });
    return usedZoneRoutes;
}
function clearUnusedZoneRoutes(zone = null) {
    let usedZoneRoutes = findUsedZoneRoutes(true);
    zones.forEach(z => {
        if (zone !== null && zone != z.index)
            return;
        let currentRoute = (z.queues + "").replace(/(^|,)(.*?),\2(,|$)/, "$1");
        z.routes = z.routes.filter(r => usedZoneRoutes.includes(r) || ((r.route + "").replace(/(^|,)(.*?),\2(,|$)/, "$1") == currentRoute) || r.realm != currentRealm);
        z.routesChanged = true;
        z.display();
    });
}
//# sourceMappingURL=zone_routes.js.map