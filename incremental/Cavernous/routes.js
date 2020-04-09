class Route {
	constructor(x, y, totalTimeAvailable, route){
		if (route) throw 123;

		if (x instanceof Location) {
			this.x = x.x;
			this.y = x.y;
			let queues = queues.map(queue => queueToString(queue));

			if (queues.every((e,i,a) => e==a[0])) {
				queues = [queues[0]];
			} else {
				let unique = queues.find((e, i, a) => a.filter(el => el == e).length == 1);
				let ununique = queues.find(e => e != unique);
				if (queues.every(e => e == unique || e == unique)) {
					queues = [unique, ununique];
				}
			}
			this.route = queues;

			this.clonesLost = clones.filter(c => c.x != this.x || c.y != this.y);

			let mana = getStat("Mana")
			let duration = mineManaRockCost(0, location.priorCompletions);
			this.manaUsed = mana.base - mana.current + duration / (clones.length - this.clonesLost);

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
		if (!prev) {
			routes.push(cur);
			return cur;
		}
		if (prev.estimateConsumeManaLeft() < cur.estimateConsumeManaLeft()) {
			routes = routes.filter(e => e != prev);
			routes.push(cur);
			return cur;
		}
		return prev;
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
