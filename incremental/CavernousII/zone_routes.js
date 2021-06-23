class ZoneRoute {
	constructor(z){
		if (z instanceof Zone){
			let route = queues.map((r, i) => (clones[i].x == this.x && clones[i].y == this.y) ? queueToStringStripped(r) : queueToString(r));
			route = route.filter(e => e.length);
			
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
			this.mana = mana.current;
			this.stuff = stuff.filter(s => s.count > 0).map(s => {
				return {
					"name": s.name,
					"count": s.count,
				};
			});
			this.require = z.startStuff.map(s => {
				return {
					"name": s.name,
					"count": s.count - getStuff(s.name).min,
				}
			}).filter(s => s.count > 0);
			return;
		}
		Object.assign(this, z);
	}

	isBetter(zoneRoute) {
		return this.mana >= zoneRoute.mana - 1e-4
			&& zoneRoute.stuff.every(s => (this.stuff.find(t => t.name == s.name) || {"count": -1}).count >= s.count)
	}

	loadRoute(zone) {
		for (let i = 0; i < zone.queues.length; i++){
			if (i == 0 || this.route.length == 1) {
				zone.queues[i].fromString(this.route[0]);
			} else if (this.route.length == 2) {
				zone.queues[i].fromString(this.route[1]);
			} else {
				zone.queues[i].fromString(this.route[i] || this.route[this.route.length - 1] || "");
			}
		}
	}

	static fromJSON(ar) {
		return ar.map(r => new ZoneRoute(r));
	}
}