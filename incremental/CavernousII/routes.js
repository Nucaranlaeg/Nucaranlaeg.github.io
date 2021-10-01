class Route {
	constructor(x) {
		if (x instanceof Location) {
			this.x = x.x;
			this.y = x.y;
			this.zone = currentZone;
			this.realm = currentRealm;
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
			// cloneHealth is [min (from start), delta]
			this.cloneHealth = clones.map(c => c.minHealth);

			this.clonesLost = clones.filter(c => c.x != this.x || c.y != this.y).length;

			let mana = getStat("Mana");
			let duration = mineManaRockCost(0, x.completions + x.priorCompletions, x.zone, this.x, this.y) * getAction("Collect Mana").getBaseDuration();
			this.manaUsed = +(mana.base - mana.current).toFixed(2);

			this.reachTime = +(queueTime / 1000).toFixed(2);
			this.progressBeforeReach = duration - x.remainingPresent / 1000 * (clones.length - this.clonesLost);
			this.requirements = zones[currentZone].startStuff.map(s => {
				return {
					"name": s.name,
					"count": s.count - getStuff(s.name).min,
				}
			}).filter(s => s.count > 0);
			this.allDead = false;

			return;
		}
		Object.assign(this, x);
	}

	pickRoute(zone, route, actualRequirements = null, health = clones.map(c => 0)){
		let routeOptions = zones[zone].sumRoute(route, actualRequirements, health);
		if (zone == 0){
			if (routeOptions.length == 0) return null;
			let health = getStat("Health");
			route = routeOptions.find(r => r[1].every(s => s.count == 0) && r[2].every(h => Math.abs(h) < health.base + getEquipHealth(r[1]))) || [];
			return route[0] ? [route[0]] : null;
		}
		for (let i = 0; i < routeOptions.length; i++){
			let routes = this.pickRoute(zone - 1, routeOptions[i][0], routeOptions[i][1], routeOptions[i][2]);
			if (routes !== null){
				return [...routes, routeOptions[i][0]];
			}
		}
		return null;
	}

	loadRoute(){
		let success = true;
		if (this.zone > 0){
			let routes = this.pickRoute(this.zone - 1, {"require": this.requirements}, null, this.cloneHealth);
			markRoutesChanged();
			this.usedRoutes = routes;
			if (routes !== null){
				for (let i = 0; i < routes.length; i++){
					routes[i].loadRoute(zones[i]);
				}
				this.loadingFailed = false;
			} else {
				success = false;
				this.loadingFailed = true;
			}
		}
		for (let i = 0; i < this.route.length; i++){
			if (!this.route[i].endsWith("I")) this.route[i] += "I";
		}
		for (let i = 0; i < zones[this.zone].queues.length; i++){
			if (i == 0 || this.route.length == 1) {
				zones[this.zone].queues[i].fromString(this.route[0]);
			} else if (this.route.length == 2) {
				zones[this.zone].queues[i].fromString(this.route[1]);
			} else {
				zones[this.zone].queues[i].fromString(this.route[i] || this.route[this.route.length - 1] || "");
			}
		}
		redrawQueues();
		return success;
	}

	getConsumeCost(relativeLevel = 0) {
		let loc = getMapLocation(this.x, this.y, false, this.zone);
		let mul = getAction("Collect Mana").getBaseDuration(this.realm);
		return mineManaRockCost(0, loc.completions + loc.priorCompletionData[this.realm] + relativeLevel, loc.zone, this.x, this.y, this.realm) * mul;
	}

	estimateConsumeManaLeft(ignoreInvalidate = false) {
		let est = 5 + zones.reduce((a, z, i) => {
			return i > this.zone ? a : a + z.cacheManaGain[this.realm]
		}, 0);
		est = est - this.manaUsed - (this.getConsumeCost() - this.progressBeforeReach) / (clones.length - this.clonesLost);
		return !ignoreInvalidate && this.invalidateCost ? est + 1000 : est;
	}

	estimateConsumeTimes() {
		let times = 0;
		let currentLeft = this.estimateConsumeManaLeft();
		let currentCost = this.getConsumeCost(times);
		let nextDiff = 0;
		while (currentLeft + 0.1 * times * this.zone > nextDiff) {
			nextDiff = (this.getConsumeCost(++times) - currentCost) / (clones.length - this.clonesLost);
		}
		return times;
	}

	estimateConsumeTimesAtOnce() {
		let baseTime = (getStat("Mana").base - this.manaUsed) * (clones.length - this.clonesLost) + this.progressBeforeReach;
		let times = 0;
		let cost = this.getConsumeCost(times);
		while (baseTime > cost) {
			baseTime -= cost;
			cost = this.getConsumeCost(++times);
		}
		return times;
	}

	static updateBestRoute(location) {
		let cur = new Route(location);
		let prev = Route.getBestRoute(location.x, location.y, currentZone);
		let curEff = cur.estimateConsumeManaLeft();
		if (!prev) {
			routes.push(cur);
			markRoutesChanged();
			return cur;
		}
		let prevEff = prev.estimateConsumeManaLeft();
		if (curEff < prevEff + 1e-4 && !prev.invalidateCost) {
			return prev;
		}
		routes = routes.filter(e => e != prev);
		routes.push(cur);
		markRoutesChanged();
		return cur;
	}

	static getBestRoute(x, y, z) {
		return routes.find(r => r.x == x && r.y == y && r.zone == z && r.realm == currentRealm);
	}

	static migrate(ar) {
		return ar;
	}

	static fromJSON(ar) {
		ar = this.migrate(ar);
		return ar.map(r => new Route(r));
	}

	static loadBestRoute() {
		let effs = routes.map(r => {
			if (r.realm != currentRealm || r.allDead) return null;
			return [r.estimateConsumeManaLeft(), r];
		}).filter(r => r !== null)
		  .sort((a, b) => b[0] - a[0]);
		for (let i = 0; i < effs.length; i++){
			if (effs[i][1].loadRoute()) return;
		}
	}

	static invalidateRouteCosts() {
		routes.filter(r => r.realm == currentRealm).forEach(r => r.invalidateCost = true);
	}

	showOnLocationUI() {
		document.querySelector("#location-route").hidden = false;
		document.querySelector("#route-has-route").hidden = false;
		document.querySelector("#route-not-visited").hidden = true;

		document.querySelector("#route-best-time").innerText = this.reachTime;
		document.querySelector("#route-best-mana-used").innerText = this.manaUsed;
		document.querySelector("#route-best-clones-lost").innerText = this.clonesLost;

		let est = this.estimateConsumeManaLeft(true);
		document.querySelector("#route-best-mana-left").innerText = est.toFixed(2);
		document.querySelector("#route-best-unminable").hidden = est >= 0;
		document.querySelector("#route-best-minable").hidden = est < 0;
		if (est > 0) {
			let estTimes = this.estimateConsumeTimes();
			document.querySelector("#route-best-minable u").innerText = estTimes;
			document.querySelector("#route-best-minable span").hidden = false;
		}
		document.querySelector("#route-best-invalidated").hidden = !this.invalidateCost;

		document.querySelector("#x-loc").value = this.x;
		document.querySelector("#y-loc").value = this.y;

		displayStuff(document.querySelector("#route-requirements"), this);

		document.querySelector("#failed-route").style.display = this.loadingFailed ? "block" : "none";
		document.querySelector("#dead-route").style.display = this.allDead ? "block" : "none";

		document.querySelector("#delete-route-button").onclick = this.deleteRoute.bind(this);
	}

	deleteRoute(){
		routes = routes.filter(r => r != this);
		showFinalLocation();
	}
}

function getBestRoute(x, y, z){
	return routes.find(r => r.x == x && r.y == y && r.zone == z && r.realm == currentRealm);
}

function setBestRoute(x, y, totalTimeAvailable){
	let bestRoute = routes.findIndex(r => r.x == x && r.y == y && r.realm == currentRealm);
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
	let bestRoute = getBestRoute(x, y, displayZone);
	if (bestRoute) bestRoute.loadRoute();
	document.activeElement.blur();
}

function updateGrindStats(){
	let rockCounts = realms
	  .filter(r => !r.locked || r.name == "Core Realm")
	  .map((r, realm_i) => zones
	    .filter(z => z.mapLocations.flat().length)
		.map((z, zone_i) => routes
		  .filter(t => t.zone == zone_i && t.realm == realm_i)
		  .reduce((a, t) => a + (t.allDead || t.loadingFailed ? 0.05 : t.estimateConsumeTimes()), 0)));
	const header = document.querySelector("#grind-stats-header");
	const body = document.querySelector("#grind-stats");
	const footer = document.querySelector("#grind-stats-footer");
	let rowTemplate = document.querySelector("#grind-row-template");
	let cellTemplate = document.querySelector("#grind-cell-template");
	if (!rockCounts) return;
	while (header.firstChild){
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
	while (body.firstChild){
		body.removeChild(body.lastChild);
	}
	for (let i = 0; i < rockCounts.length; i++){
		let headerNode = cellTemplate.cloneNode(true);
		headerNode.removeAttribute("id");
		headerNode.innerHTML = realms[i].name.replace(/ Realm/, "");
		header.appendChild(headerNode);
		let footerNode = cellTemplate.cloneNode(true);
		footerNode.removeAttribute("id");
		footerNode.innerHTML = rockCounts[i].reduce((a, c) => a + Math.floor(c));
		footer.appendChild(footerNode);
	}
	for (let i = 0; i < rockCounts[0].length; i++){
		let rowNode = rowTemplate.cloneNode(true);
		rowNode.removeAttribute("id");
		let cellNode = cellTemplate.cloneNode(true);
		cellNode.removeAttribute("id");
		cellNode.innerHTML = `z${i+1}`;
		rowNode.appendChild(cellNode);
		for (let j = 0; j < rockCounts.length; j++){
			let cellNode = cellTemplate.cloneNode(true);
			cellNode.removeAttribute("id");
			cellNode.innerHTML = Math.floor(rockCounts[j][i]);
			if (rockCounts[j][i] % 1 > 0.01){
				cellNode.classList.add("failed");
			}
			rowNode.appendChild(cellNode);
		}
		body.appendChild(rowNode);
	}
}

let routes = [];
