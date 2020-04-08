class Route {
	constructor(x, y, totalTimeAvailable, route){
		this.x = x;
		this.y = y;
		this.totalTimeAvailable = totalTimeAvailable;
		this.route = route || queues.map(queue => queueToString(queue));
		if (this.route.every((e, i, a) => e == a[0])) {
			this.route = [this.route[0]];
		}
	}

	loadRoute(){
		let newQueues = this.route.map(q => stringToQueue(q));
		for (let i = 0; i < queues.length; i++){
			if (this.route.length == 1) {
				queues[i] = stringToQueue(this.route[0])
			} else {
				queues[i] = stringToQueue(this.route[i] || "")
			}
		}
		redrawQueues();
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
