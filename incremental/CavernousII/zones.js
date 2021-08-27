let currentZone = 0;
let displayZone = 0;

class Zone {
	constructor(name, map, challengeReward = null){
		this.name = name;
		this.originalMap = map;
		this.challengeReward = challengeReward;
		this.challengeComplete = false;
		this.map = map.slice();
		this.yOffset = map.findIndex(row => row.includes("."));
		this.xOffset = map[this.yOffset].indexOf(".");
		this.mapLocations = [];
		this.manaGain = 0;
		this.queues = null;
		this.routes = [];
		this.routesChanged = true;
		this.node = null;
		this.startStuff = [];
		
		while (this.mapLocations.length < map.length){
			this.mapLocations.push([]);
		}
		setTimeout(() => {this.index = zones.findIndex(z => z == this)});
	}

	getMapLocation(x, y, adj = false){
		if (!adj && this.map[y + this.yOffset][x + this.xOffset] != "█"){
			this.getMapLocation(x-1, y-1, true);
			this.getMapLocation(x, y-1, true);
			this.getMapLocation(x+1, y-1, true);
			this.getMapLocation(x-1, y, true);
			this.getMapLocation(x+1, y, true);
			this.getMapLocation(x-1, y+1, true);
			this.getMapLocation(x, y+1, true);
			this.getMapLocation(x+1, y+1, true);
		}
		x += this.xOffset;
		y += this.yOffset;
		if (x < 0 || x >= this.map[0].length || y < 0 || y >= this.map.length) return;
		if (!this.mapLocations[y][x]){
			let mapSymbol = this.map[y][x];
			this.mapLocations[y][x] = new Location(x - this.xOffset, y - this.yOffset, this, getLocationTypeBySymbol(mapSymbol));
			classMapping[mapSymbol][2] ? mapStain.push([x, y]) : mapDirt.push([x, y]);
		}
		return this.mapLocations[y][x];
	}

	hasMapLocation(x, y) {
		return this.mapLocations[y] && this.mapLocations[y][x] != undefined;
	}

	resetZone(){
		this.map = this.originalMap.slice();
		if (this.challengeComplete) this.map = this.map.map(row => row.replace("√", "#"));
		this.mapLocations.forEach((ml, y) => {
			ml.forEach((l, x) => {
				l.reset();
			});
		});
	}

	mineComplete(){
		this.manaGain = +(this.manaGain + 0.1).toFixed(2);
		let mana = getStat("Mana");
		mana.base = +(mana.base + 0.1).toFixed(2);
		mana.current += 0.1;
		if (this.index){
			zones[this.index - 1].mineComplete();
		}
	}

	exitZone(complete = true){
		if (complete){
			// Replace only routes which are strictly worse than an existing one.
			this.lastRoute = new ZoneRoute(this);
			let sameRoute = this.routes.find(r => r.isSame(this.lastRoute));
			if (sameRoute){
				sameRoute.mana = Math.min(this.lastRoute.mana, sameRoute.mana);
				sameRoute.manaRequired = Math.min(this.lastRoute.manaRequired, sameRoute.manaRequired);
			} else if (!this.routes.some(r => r.isBetter(this.lastRoute, this.manaGain))){
				this.routesChanged = true;
				for (let i = 0; i < this.routes.length; i++){
					if (this.lastRoute.isBetter(this.routes[i], this.manaGain)){
						this.routes.splice(i, 1);
						i--;
					}
				}
				this.routes.push(this.lastRoute);
			}
		}
		this.display();
	}

	sumRoute(route, actualRequirements){
		let routeOptions = this.routes;
		routeOptions = routeOptions.map(r => {
			let requirements = (actualRequirements !== null ? actualRequirements : route.require).map(s => {
				return {
					"name": s.name,
					"count": s.count,
				};
			});
			for (let req of requirements){
				let thing = r.stuff.find(s => s.name == req.name);
				if (thing){
					req.count = Math.max(req.count - thing.count, 0);
				}
			}
			for (let thing of r.require){
				let req = requirements.find(s => s.name == thing.name);
				if (req){
					req.count += thing.count;
				} else {
					requirements.push({
						"name": thing.name,
						"count": thing.count,
					});
				}
			}
			return [r, requirements];
		});
		return routeOptions.sort((a, b) => b[0].mana - a[0].mana);
	}

	enterZone(){
		this.display();
		let zoneSelect = document.querySelector("#zone-select");
		let currentActiveZone = zoneSelect.querySelector(".active-zone");
		if (currentActiveZone) currentActiveZone.classList.remove("active-zone");
		zoneSelect.children[currentZone].classList.add("active-zone");
		if (this.name == "Zone 2" && getMessage("Enter New Zone").display()){
			if (settings.running) toggleRunning();
		}
		let mana = getStat("Mana");
		mana.current += this.manaGain;
		mana.base += this.manaGain;
		mana.min = mana.current;
		this.startMana = mana.current;
		this.zoneStartTime = queueTime;
		if (this.queues === null){
			this.queues = ActionQueue.fromJSON([[]]);
		}
		while (this.queues.length < clones.length){
			let q = new ActionQueue();
			q.index = this.queues.length;
			this.queues.push(q);
		}
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
		if (this.name != "Zone 1"){
			skipActionComplete = true;
		}
		this.startStuff = stuff.filter(s => s.count > 0).map(s => {
			s.resetMin();
			return {
				"name": s.name,
				"count": s.count
			};
		});
	}

	display(){
		if (!this.node){
			this.node = document.querySelector("#zone-template").cloneNode(true);
			this.node.removeAttribute("id");
			let zoneSelect = document.querySelector("#zone-select");
			zoneSelect.appendChild(this.node);
		}
		if (currentZone == displayZone) document.querySelector("#zone-name").innerHTML = this.name;
		this.node.querySelector(".name").innerHTML = this.name;
		this.node.querySelector(".mana").innerHTML = `+${this.manaGain}`;
		this.node.onclick = () => {
			document.querySelector("#zone-name").innerHTML = this.name;
			displayZone = zones.findIndex(z => z.name == this.name);
			maybeClearCursor();
			isDrawn = false;
			mapDirt = [];
			mapStain = [];
			drawMap();
			redrawQueues();
			if (currentZone == displayZone) highlightCompletedActions();
		};
		let parent = this.node.querySelector(".routes");
		if (this.routesChanged){
			while (parent.firstChild){
				parent.removeChild(parent.lastChild);
			}
			let head = document.createElement("h4");
			head.innerHTML = "Routes (click to load):";
			parent.appendChild(head);
			let routeTemplate = document.querySelector("#zone-route-template");
			parent.style.display = this.routes.length ? "block" : "none";
			for (let i = 0; i < this.routes.length; i++){
				let routeNode = routeTemplate.cloneNode(true);
				routeNode.removeAttribute("id");
				routeNode.querySelector(".mana").innerHTML = this.routes[i].mana.toFixed(2);
				let thing;
				if (this.routes[i].require.length){
					routeNode.querySelector(".require").innerHTML = this.routes[i].require
						.map(s => `<span style="color: ${(thing = getStuff(s.name)).colour}">${s.count}${thing.icon}</span>`)
						.join("") + rightArrowSVG;
				}
				routeNode.querySelector(".stuff").innerHTML = this.routes[i].stuff.map(s => `<span style="color: ${(thing = getStuff(s.name)).colour}">${s.count}${thing.icon}</span>`).join("");
				routeNode.onclick = () => {
					this.routes[i].loadRoute(this);
					parent.querySelectorAll(".active").forEach(node => node.classList.remove("active"));
					routeNode.classList.add("active");
				}
				routeNode.querySelector(".delete-route").onclick = this.deleteRoute.bind(this, i);
				parent.appendChild(routeNode);
			}
		}
		this.displaySelectedRoute();
	}
	
	displaySelectedRoute(){
		let parent = this.node.querySelector(".routes");
		parent.querySelectorAll(".active").forEach(node => node.classList.remove("active"));
		let currentRoute = (this.queues + "").replace(/(^|,)(.*?),\2(,|$)/, "$1");
		let routeIndex = this.routes.findIndex(r => (r.route + "").replace(/(^|,)(.*?),\2(,|$)/, "$1") == currentRoute);
		if (routeIndex > -1) parent.children[routeIndex + 1].classList.add("active");
	}

	deleteRoute(index, event){
		this.routes.splice(index, 1);
		this.display();
		event.stopPropagation();
	}

	completeChallenge(){
		if (this.challengeComplete) return;
		this.challengeComplete = true;
		this.challengeReward();
	}
}

function moveToZone(zone, complete = true){
	if (typeof(zone) == "string"){
		zone = zones.findIndex(z => z.name == zone);
	}
	zones[currentZone].exitZone(complete);
	if (currentZone == displayZone){
		displayZone = zone;
		maybeClearCursor();
	}
	currentZone = zone;
	zones[zone].enterZone();
}

let zones = [
	new Zone("Zone 1",
		[
			'████████████████',
			'███████+##+█████',
			'██####% █████%██',
			'██%██#█##%█¢#♠♥█',
			'███###███¤██#███',
			'██+♠████%♠%█#╬██',
			'█¤█+██.###♠=#⎶██',
			'█%##███#+█#+##██',
			'███###█¤██##█♠██',
			'███#█#██¤♠ ♠█++█',
			'█#  █#████♠♣████',
			'█♠███#████+♠♣♠██',
			'█♠%█#####+███♣██',
			'█#%█+##██#####██',
			'█#%█##♠#%████ Θ█',
			'██%███#█#%#█████',
			'█¤#¥██++██#£░╖√█',
			'████████████████',
		],
		() => {
			getMessage("Unlocked Duplication Rune").display();
			getRune("Duplication").unlock();
		}
	),
	new Zone("Zone 2",
		[
			'████████████████',
			'██████████#+█ ¤█',
			'█%#+██+#█╬#██ ██',
			'█%█¤██###%#%)+#█',
			'█%#««█%█+█████¤█',
			'████«███ █##♥███',
			'█+#█%#█¤#█=█#%██',
			'██#██##♠#####███',
			'█##%█+██.███##██',
			'█+#%██████¤██%#█',
			'███%«««%+#♣««g#█',
			'█+████████ ██##█',
			'█+########√#████',
			'███████████###^█',
			'██¤█%█###████#██',
			'█Θ+«%#«█««««««██',
			'████████████████',
		],
		() => {
			getMessage("Unlocked Weaken Rune").display();
			getRune("Weaken").unlock();
		}
	),
	new Zone("Zone 3",
		[
			'████████████████',
			'████+███████████',
			'███«««██████████',
			'██¤+█«+█¤███████',
			'█+██=«gg⎶███████',
			'█%%██.██████████',
			'█♣%%%%╬█████████',
			'█♣█ ██[#████████',
			'█+█ ███~#███████',
			'█###░√██████████',
			'█+███&+█████████',
			'█#██████████████',
			'█#♠#%%██████████',
			'██#██%██████████',
			'█%#+█%○█████████',
			'██+¤████████████',
			'████████████████',
		],
		() => {
			getMessage("Unlocked Wither Rune").display();
			getRune("Wither").unlock();
		}
	),
];
