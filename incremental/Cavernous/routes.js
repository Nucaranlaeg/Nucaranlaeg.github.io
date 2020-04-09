class Route {
	constructor(x, y, totalTimeAvailable, route){
		if (route) throw 123;

		if (x instanceof Location) {
			this.x = x.x;
			this.y = x.y;
			let route = queues.map(r => queueToString(r));
			route = route.filter(e=>e.length)

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

			this.clonesLost = clones.filter(c => c.x != this.x || c.y != this.y).length;

			let mana = getStat("Mana")
			let duration = mineManaRockCost(0, location.priorCompletions);
			this.manaUsed = +(mana.base - mana.current).toFixed(2);

			return;

		}
		Object.assign(this, x);
	}

	loadRoute(){
		for (let i = 0; i < queues.length; i++){
			if (i == 0 || this.route.length == 1) {
				queues[i] = stringToQueue(this.route[0]);
			} else if (this.route.length == 2) {
				queues[i] = stringToQueue(this.route[1]);
			} else {
				queues[i] = stringToQueue(this.route[i] || this.route[this.route.length - 1] || "");
			}
		}
		redrawQueues();
	}

	getConsumeCost() {
		let loc = getMapLocation(this.x, this.y);
		return mineManaRockCost(0, loc.completions + loc.priorCompletions);
	}

	estimateConsumeManaLeft() {
		return getStat("Mana").base - this.manaUsed - this.getConsumeCost() / (clones.length - this.clonesLost);
	}

	static updateBestRoute(location) {
		let cur = new Route(location);
		let prev = Route.getBestRoute(location.x, location.y);
		let curEff = cur.estimateConsumeManaLeft();
		if (!prev) {
			routes.push(cur);
			settings.debug && log('found path to %o:\nnow: %o*%os: %oeff',//
				location, (clones.length - cur.clonesLost), cur.manaUsed, curEff, cur)
			return cur;
		}
		let prevEff = prev.estimateConsumeManaLeft();
		if (curEff < prevEff + 1e-4) {
			return prev;
		}
		settings.debug && log('updated path to %o:\nwas: %o*%os, %oeff: %o\nnow: %o*%os: %oeff',//
			location, (clones.length - prev.clonesLost), prev.manaUsed, prevEff,//
			prev, (clones.length - cur.clonesLost), cur.manaUsed, curEff, cur)
		routes = routes.filter(e => e != prev);
		routes.push(cur);
		return cur;
	}

	static getBestRoute(x, y) {
		return routes.find(r => r.x == x && r.y == y);
	}

	static migrateFromArray(r) {
		let [x, y, totalTimeAvailable, route] = r;
		return new Route({
			x, y, route, 
			manaUsed: getStat("Mana").base - totalTimeAvailable / clones.length,
			clonesLost: 0,
		});
	}

	static fromJSON(ar) {
		return ar.map(r => new Route(r));
	}

	static loadBestRoute() {
		let bestEff = -999;
		let bestRoute = routes[0];
		for (let r of routes) {
			let eff = r.estimateConsumeManaLeft();
			if (eff > bestEff) {
				bestEff = eff;
				bestRoute = r;
			}
		}
		settings.debug && log('best route is now: %o\n %o*%os, eff:%o: %o', //
			getMapLocation(bestRoute.x, bestRoute.y), (clones.length - bestRoute.clonesLost),//
			 +(getStat("Mana").base - bestRoute.manaUsed).toFixed(2), +bestEff.toFixed(2), bestRoute)
		bestRoute.loadRoute();
	}
}

function getBestRoute(x, y){
	return routes.find(r => r.x == x && r.y == y);
}

function setBestRoute(x, y, totalTimeAvailable){
	let bestRoute = routes.findIndex(r => r.x == x && r.y == y);
	if (bestRoute == -1 || routes[bestRoute].totalTimeAvailable < totalTimeAvailable){
		if (bestRoute > -1){
			routes.splice(bestRoute, 1);
		}
		routes.push(new Route(x, y, totalTimeAvailable));
	}
}

function loadRoute(){
	let x = document.querySelector("#x-loc").value;
	let y = document.querySelector("#y-loc").value;
	let bestRoute = getBestRoute(x, y);
	if (bestRoute) bestRoute.loadRoute();
}

let routes = [];
