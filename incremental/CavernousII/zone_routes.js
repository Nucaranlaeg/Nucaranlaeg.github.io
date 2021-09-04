class ZoneRoute {
	constructor(z){
		if (z instanceof Zone){
			let route = queues.map((r, i) => (clones[i].x == this.x && clones[i].y == this.y) ? queueToStringStripped(r) : queueToString(r));
			route = route.filter(e => e.length);
			
			this.realm = currentRealm;

			if (route.every((e,i,a) => e==a[0])) {
				route = [route[0]];
			} else {
				let unique = route.find((e, i, a) => a.filter(el => el == e).length == 1);
				let ununique = route.find(e => e != unique);
				if (route.every(e => e == unique || e == ununique)) {
					route = [unique, ununique];
				}
			}
			this.route = route;
			let mana = getStat("Mana");
			this.mana = mana.current - z.startMana;
			this.stuff = stuff.filter(s => s.count > 0).map(s => {
				return {
					"name": s.name,
					"count": s.count - getStuff(s.name).min,
				};
			}).filter(s => s.count > 0);
			let health = getStat("Health");
			// cloneHealth is [min (from start), delta]
			this.cloneHealth = clones.map(c => [c.minHealth, c.startDamage - c.damage]);
			this.manaRequired = z.startMana - mana.min;
			this.require = z.startStuff.map(s => {
				return {
					"name": s.name,
					"count": s.count - getStuff(s.name).min,
				};
			}).filter(s => s.count > 0);
			return;
		}
		Object.assign(this, z);
	}

	isBetter(zoneRoute, zoneMana = 0.1) {
		return (this.mana >= zoneRoute.mana - 0.1
			&& this.manaRequired <= zoneRoute.manaRequired + zoneMana
			&& zoneRoute.stuff.every(s => (this.stuff.find(t => t.name == s.name) || {"count": -1}).count >= s.count)
			&& this.require.every(s => (zoneRoute.require.find(t => t.name == s.name) || {"count": -1}).count >= s.count))
			&& this.cloneHealth.every((c, i) => c[0] > (zoneRoute.cloneHealth[i] || [0])[0] - 0.1 && c[1] > (zoneRoute.cloneHealth[i] || [0,0])[1] - 0.1);
	}

	isSame(zoneRoute) {
		return this.realm == zoneRoute.realm && this.route.length == zoneRoute.route.length && this.route.every((r, i) => r == zoneRoute.route[i]);
	}

	loadRoute(zone) {
		let actualCurrentZone = currentZone;
		currentZone = zone.index;
		for (let i = 0; i < zone.queues.length; i++){
			if (i == 0 || this.route.length == 1) {
				zone.queues[i].fromString(this.route[0]);
			} else if (this.route.length == 2) {
				zone.queues[i].fromString(this.route[1]);
			} else {
				zone.queues[i].fromString(this.route[i] || this.route[this.route.length - 1] || "");
			}
		}
		currentZone = actualCurrentZone;
		zone.displaySelectedRoute();
		return this.require;
	}

	static fromJSON(ar) {
		return ar.map(r => new ZoneRoute(r));
	}
}