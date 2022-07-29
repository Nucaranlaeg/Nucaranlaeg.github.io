let currentZone = 0;
let displayZone = 0;

class Zone {
	name: string;
	originalMap: string[];
	goalReward: (() => void) | null;
	goalComplete: boolean;
	map: string[];
	yOffset: number;
	xOffset: number;
	mapLocations: MapLocation[][];
	manaGain: number;
	queues: ActionQueue[];
	routes: ZoneRoute[];
	routesChanged: boolean;
	node: HTMLElement | null;
	cacheManaGain: number[];
	startStuff: simpleStuffList;
	index: number = 0;
	lastRoute: ZoneRoute | null;
	startMana: any;
	zoneStartTime: number;
	manaDrain: number = 0;

	public constructor(name: string, map: string[], goalReward: (() => void) | null = null) {
		this.name = name;
		this.originalMap = map;
		this.goalReward = goalReward;
		this.goalComplete = false;
		this.map = map.slice();
		this.yOffset = map.findIndex(row => row.includes("."));
		this.xOffset = map[this.yOffset].indexOf(".");
		this.mapLocations = [];
		this.manaGain = 0;
		this.queues = ActionQueue.fromJSON([]);
		this.routes = [];
		this.routesChanged = true;
		this.node = null;
		this.cacheManaGain = [0];
		this.startStuff = [];
		this.lastRoute = null;
		this.zoneStartTime = -1;

		while (this.mapLocations.length < map.length) {
			this.mapLocations.push([]);
		}
		setTimeout(() => {
			this.index = zones.findIndex(z => z == this);
		});
	}

	getMapLocation(x: number, y: number, noView = false): MapLocation | null {
		if (!noView && this.map[y + this.yOffset][x + this.xOffset] != "█") {
			this.getMapLocation(x - 1, y - 1, true);
			this.getMapLocation(x, y - 1, true);
			this.getMapLocation(x + 1, y - 1, true);
			this.getMapLocation(x - 1, y, true);
			this.getMapLocation(x + 1, y, true);
			this.getMapLocation(x - 1, y + 1, true);
			this.getMapLocation(x, y + 1, true);
			this.getMapLocation(x + 1, y + 1, true);
		}
		x += this.xOffset;
		y += this.yOffset;
		if (x < 0 || x >= this.map[0].length || y < 0 || y >= this.map.length) return null;
		if (!this.mapLocations[y][x]) {
			let mapSymbol = this.map[y][x];
			this.mapLocations[y][x] = new MapLocation(x - this.xOffset, y - this.yOffset, this, getLocationTypeBySymbol(mapSymbol)!);
			classMapping[mapSymbol][2] ? mapStain.push([x, y]) : mapDirt.push([x, y]);
		}
		return this.mapLocations[y][x];
	}

	getAdjLocations(x: number, y: number) {
		x += this.xOffset;
		y += this.yOffset;
		return [
			[x - 1, y],
			[x + 1, y],
			[x, y + 1],
			[x, y - 1]
		]
			.map(adj => {
				if (adj[0] < 0 || adj[0] >= this.map[0].length || adj[1] < 0 || adj[1] >= this.map.length) return;
				return [this.map[adj[1]][adj[0]], this.mapLocations[adj[1]][adj[0]]];
			})
			.filter(x => x);
	}

	hasMapLocation(x: number, y: number) {
		return this.mapLocations[y] && this.mapLocations[y][x] !== undefined;
	}

	resetZone() {
		this.map = this.originalMap.slice() as unknown as string[];
		if (realms[currentRealm].name == "Verdant Realm") {
			// Visual changes
			this.map = convertMapToVerdant(this.map, this.index);
		}
		if (this.goalComplete) this.map = this.map.map(row => row.replace("√", "#"));
		let unlockedBarriers = getRealm("Compounding Realm").machineCompletions;
		for (let i = 1; i <= 9; i++){
			if (i > unlockedBarriers) this.map = this.map.map(row => row.replace(i.toString(), "█"));
		}
		this.mapLocations.forEach((ml, y) => {
			ml.forEach((l, x) => {
				l.reset();
			});
		});
		this.zoneStartTime = -1;
		this.manaDrain = 0;
	}

	mineComplete() {
		let realm:Realm
		this.manaGain = +(this.manaGain + 0.1).toFixed(2);
		let mana = getStat("Mana");
		mana.base = +(mana.base + 0.1).toFixed(2);
		mana.current += 0.1;
		this.cacheManaGain[currentRealm] += 0.1;
		if (this.index) {
			zones[this.index - 1].mineComplete();
		}
		realm = getRealm("Verdant Realm")
		if (realms[currentRealm].name == "Verdant Realm" && this.index == 0 && realm.mult !== null) {
			realm.mult += 0.0005;
		}
		realm = getRealm("Compounding Realm")
		if (realms[currentRealm].name == "Compounding Realm" && this.index == 0 && realm.mult !== null) {
			realm.mult += 0.05;
			stats
				.filter(s => s.learnable && s.base >= 99 + getRealmMult("Compounding Realm"))
				.forEach(s => {
					s.dirty = true;
					s.update(true);
				});
		}
		this.display();
	}

	exitZone(complete = true) {
		let needRecalc = false;
		if (complete) {
			// Replace only routes which are strictly worse than an existing one.
			this.lastRoute = new ZoneRoute(this);
			let sameRoute = this.routes.find(r => r.isSame(this.lastRoute!));
			if (sameRoute) {
				(sameRoute.mana = this.lastRoute.mana), sameRoute.mana;
				(sameRoute.manaRequired = this.lastRoute.manaRequired), sameRoute.manaRequired;
				sameRoute.stuff = this.lastRoute.stuff;
				sameRoute.require = this.lastRoute.require;
				sameRoute.cloneHealth = this.lastRoute.cloneHealth;
			} else if (!this.routes.some(r => r.realm == currentRealm && r.isBetter(this.lastRoute!, this.manaGain))) {
				this.routesChanged = true;
				for (let i = 0; i < this.routes.length; i++) {
					if (this.routes[i].realm != currentRealm || this.routes[i].isLocked) continue;
					if (this.lastRoute.isBetter(this.routes[i], this.manaGain)) {
						this.routes.splice(i, 1);
						i--;
						needRecalc = true;
					}
				}
				this.routes.push(this.lastRoute);
				needRecalc = true;
			}
		}
		if (needRecalc){
			routes.forEach(r => {
				if (r.realm == currentRealm && r.zone > this.index) r.needsNewEstimate = true;
			});
		}
		this.display();
		currentLoopLog.moveZone();
	}

	sumRoute(require: simpleStuffList, startDamage: number[], actionCount: number) {
		let routeOptions = this.routes
			// .filter(r => !r.noValidPrior)
			.filter(r => r.realm == currentRealm)
			.filter(r => {
				let reqs = (require || []).map(s => {
					return {
						name: s.name,
						count: s.count
					};
				});
				for (let req of reqs) {
					let thing = r.stuff.find(s => s.name == req.name);
					if (!thing || req.count > thing.count) {
						return false;
					}
				}
				if (actionCount && r.actionCount > actionCount) return false;
				return true;
			})
			.map(r => {
				let health = startDamage.map((h, i) => {
					if (r.cloneHealth[i] === undefined) return h;
					return Math.max(h + r.cloneHealth[i][1], 0) + r.cloneHealth[0][0];
				});
				let effectiveMana = r.mana + (Math.floor(r.stuff.find(s => s.name == "Gold Nugget")?.count || 0) * (GOLD_VALUE * getRealmMult("Verdant Realm", true) - 1 / clones.length));
				let result: [ZoneRoute, ZoneRoute["require"], number[], number] = [r, r.require, health, effectiveMana];
				return result;
			});
		return routeOptions.sort((a, b) => actionCount && a[0].actionCount != b[0].actionCount ? a[0].actionCount - b[0].actionCount : b[3] - a[3]);
	}

	enterZone() {
		this.display();
		let zoneSelect = document.querySelector("#zone-select");
		if (zoneSelect === null) throw new Error("No zone select found");
		let currentActiveZone = zoneSelect.querySelector(".active-zone");
		if (currentActiveZone) currentActiveZone.classList.remove("active-zone");
		zoneSelect.children[currentZone].classList.add("active-zone");
		if (this.name == "Zone 2" && getMessage("Enter New Zone").display()) {
			if (settings.running) toggleRunning();
		}
		if (this.name == "Zone 7" && getMessage("Game Slowdown").display()) {
			if (settings.running) toggleRunning();
		}
		let mana = getStat("Mana");
		mana.current += this.manaGain;
		mana.base += this.manaGain;
		mana.min = mana.current;
		this.startMana = mana.current;
		this.zoneStartTime = queueTime;
		resetQueueHighlights();
		clones.forEach(c => c.enterZone());
		redrawQueues();
		isDrawn = false;
		this.getMapLocation(0, 0);
		this.mapLocations.forEach((ml, y) => {
			ml.forEach((l, x) => {
				mapDirt.push([x, y]);
			});
		});
		if (this.name != "Zone 1") {
			skipActionComplete = true;
		}
		this.startStuff = stuff
			.filter(s => s.count > 0)
			.map(s => {
				s.resetMin();
				return {
					name: s.name,
					count: s.count
				};
			});
	}

	display() {
		while (this.queues.length < clones.length) {
			let q = new ActionQueue(this.queues.length);
			this.queues.push(q);
		}
		if (!this.node) {
			const zoneTemplate = document.querySelector("#zone-template");
			if (zoneTemplate === null) throw new Error("No zone template found");
			this.node = zoneTemplate.cloneNode(true) as HTMLElement;
			this.node.removeAttribute("id");
			let zoneSelect = document.querySelector("#zone-select");
			if (zoneSelect === null) throw new Error("No zone select found");
			zoneSelect.appendChild(this.node);
		}
		if (currentZone == displayZone) {
			document.querySelector("#zone-name")!.innerHTML = this.name;
			setTimeout(() => showFinalLocation());
		}
		this.node.querySelector(".name")!.innerHTML = this.name;
		this.node.querySelector(".mana")!.innerHTML = `+${this.manaGain}`;
		this.node.onclick = () => {
			document.querySelector("#zone-name")!.innerHTML = this.name;
			displayZone = zones.findIndex(z => z.name == this.name);
			clearCursors();
			isDrawn = false;
			mapDirt = [];
			mapStain = [];
			drawMap();
			redrawQueues();
			zoneTimeNode = zoneTimeNode || document.querySelector("#time-spent-zone");
			if (this.zoneStartTime == -1){
				zoneTimeNode.innerText = "0";
			} else {
				zoneTimeNode.innerText = writeNumber(Math.max(0, (zones[this.index + 1]?.zoneStartTime + 1 || queueTime) - 1 - (this.zoneStartTime  || 0)) / 1000, 1);
			}
		};
		if (this.routesChanged) {
			let parent = this.node.querySelector(".routes") as HTMLElement;
			if (parent === null) throw new Error("Routes element not found");

			while (parent.lastChild) {
				parent.removeChild(parent.lastChild);
			}
			let head = document.createElement("h4");
			head.innerHTML = "Routes (click to load, ctrl-click here to clear unused routes):<br>Shift-click a route to prevent deletion.";
			head.onclick = this.clearRoutes.bind(this);
			parent.appendChild(head);
			let routeTemplate = document.querySelector("#zone-route-template");
			if (routeTemplate === null) throw new Error("No route template found");
			parent.style.display = this.routes.some(r => r.realm == currentRealm) ? "block" : "none";
			let usedRoutes = findUsedZoneRoutes();
			for (let i = 0; i < this.routes.length; i++) {
				if (this.routes[i].realm != currentRealm) continue;
				let routeNode = routeTemplate.cloneNode(true) as HTMLElement;
				routeNode.removeAttribute("id");
				if (this.routes[i].actionCount) routeNode.querySelector(".actions")!.innerHTML = this.routes[i].actionCount.toString() + "&nbsp;";
				routeNode.querySelector(".mana")!.innerHTML = this.routes[i].mana.toFixed(2);
				displayStuff(routeNode, this.routes[i]);
				routeNode.onclick = (e) => {
					if (e.shiftKey){
						if (this.routes[i].isLocked){
							this.routes[i].isLocked = false;
							routeNode.querySelector<HTMLElement>(".delete-route-inner")!.innerHTML = "x";
							routeNode.querySelector<HTMLElement>(".delete-route-inner")!.onclick = this.deleteRoute.bind(this, i);
						} else {
							this.routes[i].isLocked = true;
							routeNode.querySelector<HTMLElement>(".delete-route-inner")!.innerHTML = "";
							routeNode.querySelector<HTMLElement>(".delete-route-inner")!.onclick = () => {};
						}
						return;
					}
					this.routes[i].loadRoute(this);
					parent.querySelectorAll("div.active").forEach(node => node.classList.remove("active"));
					routeNode.classList.add("active");
				};
				routeNode.title = "";
				if (this.routes[i].isLocked){
					routeNode.querySelector<HTMLElement>(".delete-route-inner")!.innerHTML = "";
				} else {
					routeNode.querySelector<HTMLElement>(".delete-route-inner")!.onclick = this.deleteRoute.bind(this, i);
				}
				if (!usedRoutes.includes(this.routes[i])) {
					routeNode.classList.add("unused");
					routeNode.title += "This route is not used for any saved route. ";
				}
				if (this.index > 0 && !zones[this.index - 1].sumRoute(this.routes[i].require, this.routes[i].cloneHealth.map(c => c[0]), this.routes[i].actionCount).length){
					routeNode.classList.add("orphaned");
					routeNode.title += "This route has no valid predecessor. ";
				}
				parent.appendChild(routeNode);
			}
			let foot = document.createElement("h4");
			foot.innerHTML = "Legend:";
			parent.appendChild(foot);
			let leg1 = document.createElement("h4");
			leg1.classList.add("route-legend");
			leg1.classList.add("active");
			leg1.innerHTML = "Active";
			parent.appendChild(leg1);
			let leg2 = document.createElement("h4");
			leg2.classList.add("route-legend");
			leg2.classList.add("unused");
			leg2.innerHTML = "Unused";
			parent.appendChild(leg2);
			let leg3 = document.createElement("h4");
			leg3.classList.add("route-legend");
			leg3.classList.add("orphaned");
			leg3.innerHTML = "Orphaned";
			parent.appendChild(leg3);
			this.routesChanged = false;
		}
		this.displaySelectedRoute();
	}

	displaySelectedRoute() {
		if (this.node === null) throw new Error("Missing display node");
		let parent = this.node.querySelector(".routes");
		if (parent === null) throw new Error("Routes element not found");
		parent.querySelectorAll("div.active").forEach(node => node.classList.remove("active"));
		let currentRoute = (this.queues + "").replace(/(^|,)(.*?),\2(,|$)/, "$1");
		this.routes
			.filter(r => r.realm == currentRealm)
			.forEach((r, i) => {
				if ((r.route + "").replace(/(^|,)(.*?),\2(,|$)/, "$1") == currentRoute && parent!.children[i + 1])
					parent!.children[i + 1].classList.add("active");
			});
	}

	clearRoutes(event: MouseEvent){
		if (!event.ctrlKey && !event.metaKey) return;
		if (settings.warnings && !confirm(`Really delete unused routes?`)) return;
		clearUnusedZoneRoutes(this.index);
	}

	deleteRoute(index: number, event:Event) {
		this.routes.splice(index, 1);
		markRoutesChanged();
		this.display();
		event.stopPropagation();
	}

	completeGoal() {
		if (this.goalComplete || this.goalReward === null) return;
		this.goalComplete = true;
		this.goalReward();
	}

	tick(time: number) {
		// Optimize by keeping a list of watery locations?
		this.mapLocations.forEach(row => row.forEach(loc => loc.zoneTick(time)));
		if (this.manaDrain){
			let drainValue = time * this.manaDrain * getStat("Chronomancy").value;
			getStat("Mana").spendMana(drainValue / 1000);
			currentLoopLog.addActionTime("Barrier Drain", this.index, drainValue * clones.length);
			totalDrain += drainValue / 1000;
		}
	}
}

function markRoutesChanged() {
	zones.forEach(z => (z.routesChanged = true));
}

function moveToZone(zone:string|number, complete = true) {
	if (typeof zone == "string") {
		zone = zones.findIndex(z => z.name == zone);
	}
	if (!zones[zone]) {
		settings.running = false;
		return;
	}
	zones[currentZone].exitZone(complete);
	if (currentZone == displayZone && settings.followZone) {
		displayZone = zone;
		clearCursors();
	}
	currentZone = zone;
	zones[zone].enterZone();
}

function recalculateMana() {
	zones.forEach(z => (z.manaGain = 0));
	zones.forEach((z, i) => {
		z.manaGain = z.mapLocations
			.flat()
			.filter(l => l.type.name == "Mana-infused Rock")
			.reduce((a, c) => a + c.priorCompletions, 0);
		z.manaGain /= 10;
		for (let j = 0; j < i; j++) {
			zones[j].manaGain += z.manaGain;
		}
	});
	zones.forEach(z => {
		z.manaGain = +z.manaGain.toFixed(2);
		if (z.queues && z.mapLocations.some(r => r.some(x => x))) z.display();
		z.cacheManaGain[currentRealm] = z.manaGain;
	});
}

const zones = [
	new Zone(
		"Zone 1",
		[
			"█████████████████████",
			"███████+##+██████████",
			"██####% █████%███████",
			"██%██#█##%█¢#♠♥████¤█",
			"███###███¤██#███¤♣█╣█",
			"██+♠████%♠%█#╬███#█╣█",
			"█¤█+██.###♠=#⎶█☼█#█╣█",
			"█%##███#+█#+##█%##█╣█",
			"███###█¤██##█♠███+█╣█",
			"███#█#██¤♠ ♠█++██#█╣█",
			"█#  █#████♠♣█████#█3█",
			"█♠███#████+♠♣♠██  2#█",
			"█♠%█#####+███♣1# ██#█",
			"█#%█+##██#####████##█",
			"█#%█##♠#%████ Θ██☼#+█",
			"██%███#█#%#██████+¤+█",
			"█¤#¥██++██#£░╖√██████",
			"█████████████████████",
		],
		() => {
			getMessage("Unlocked Duplication Rune").display();
			getRune("Duplication").unlock();
		}
	),
	new Zone(
		"Zone 2",
		[
			"███████████████████",
			"█¥#¢███████████████",
			"██%██████████#+█ ¤█",
			"█╖○█%#+██+#█╬#██ ██",
			"█♣%█%█¤██###%#%)+#█",
			"█♣██%#««█%█+█████¤█",
			"█«█████«███ █##♥███",
			"█«~1+#█%#█¤#█=█#%██",
			"█╖███#██##♠#####███",
			"█++█##%█+██.███##██",
			"██¤█+#%██████¤██%#█",
			"██2███%«««%+#♣««g#█",
			"██#█+████████ ██##█",
			"█##█+########√#████",
			"█c████████████###^█",
			"█○○██¤█%█###████#██",
			"██¤█Θ+«%#«█««««««██",
			"██3████████████████",
			"██««○♣¤████████████",
			"████○██████████████",
			"███████████████████",
		],
		() => {
			getMessage("Unlocked Weaken Rune").display();
			getRune("Weaken").unlock();
		}
	),
	new Zone(
		"Zone 3",
		[
			"██████████████████████",
			"████+█████%█%%███++███",
			"███«««████¤██%+█¤█+███",
			"██¤+█«+█¤█+%█#+█#█|███",
			"█+██=«gg⎶█g██##█s█♣███",
			"█%%██.████♣▣█#♥█#█#███",
			"█♣%%%%╬██+####██#█#███",
			"█♣█ ██[#█+███#(█###3#█",
			"█+█ ███~#%█^█#███2██#█",
			"█###░√█████♠█#1   █☼☼█",
			"█+███&+]██Θc##███«██«█",
			"█#█████##██#█#+█««☼█¤█",
			"█#♠#%%██+█+#██#█«█████",
			"██#██%██#██░█%%█««████",
			"█%#+█%○█##█¤█%%█░○████",
			"██+¤█████████%██¤£████",
			"██████████████████████",
		],
		() => {
			getMessage("Unlocked Wither Rune").display();
			getRune("Wither").unlock();
		}
	),
	new Zone(
		"Zone 4",
		[
			"███████████████████",
			"███m++++++  ¤██████",
			"███3███████████████",
			"██§§¤█.╖╖√++█«█«%«█",
			"██§███α████+█¤█%«▣█",
			"██§█+█╖█++███~█«%%█",
			"██§█««♣««███+~█%««█",
			"█§§█=█α█%█¤█«██«%«█",
			"█§████«███««««+«█╖█",
			"█2██&+«╖¤██«█████○█",
			"█#|███«███⎶ █«α«+«█",
			"█#██%««♣««++█α█+█{█",
			"█%██○██«█████«α████",
			"█%¤███««c««███¤█╖Θ█",
			"█ ██╬««███╖««███╖██",
			"█ ████}█+███c█«««██",
			"█ ██^███♠♠♠+α+«████",
			"█ m1+++♠♠████¤█████",
			"███████████████████",
		],
		() => {
			getMessage("Other Realms").display();
			realms[0].unlock();
			realms[1].unlock();
		}
	),
	new Zone(
		"Zone 5",
		[
			"███████████████████",
			"███████++█+#««█████",
			"█████¤~+♣#++█«█████",
			"█%█+███++████12 ███",
			"█+0.╖█████«0╖√█ ███",
			"█%██╖█=█¤█«████ ███",
			"████«««««««█¤♠█ ███",
			"██««««««««███♠█ ███",
			"██«««█0«««««♠♠█ ███",
			"██«««██«««««█+█ ███",
			"██«««««««██«███ ███",
			"█««««««█««█«███ ███",
			"█«██««««««««+██ %%█",
			"█+█0«███«««████%%%█",
			"█%«█«s«█+████Θ█%%%█",
			"██«██0«████««╖█¤███",
			"██+███s«««««███3███",
			"██~~~¤██¤█████¤δ███",
			"███████████████████",
		],
		() => {
			getMessage("Further Realms").display();
			realms[2].unlock();
		}
	),
	new Zone(
		"Zone 6",
		[
			"████████████████",
			"█%██╬█=███¤█%%+█",
			"█%%█%█ ██  █%███",
			"██ %§%. █ █§%§██",
			"████%██║    █%██",
			"█+%§ % ██████%♥█",
			"█%█%██ █%%%  ███",
			"██+%%█%%§███  +█",
			"████%███%%+██ +█",
			"█§§§§█╣Θ█████ ██",
			"█+████ ███%%§ ¤█",
			"█%%██  █¤§██%███",
			"██++█ ███╖╖╖%§§█",
			"█+++█     ████~█",
			"███╖████ ^████~█",
			"███╖╖╖╖~╣██√╣╖~█",
			"█¤██████1███████",
			"█╖%>█   ~████+¤█",
			"█%%╖§ ████[█++██",
			"██%<█2█╖  m+++██",
			"█████╖╖╖██]██3██",
			"████████████¤~██",
			"████████████████",
		],
		() => {
			getMessage("Unlocked Teleport Runes").display();
			getRune("Teleport To").unlock();
			getRune("Teleport From").unlock();
		}
	),
	new Zone(
		"Zone 7",
		[
			"██████████████████",
			"█«««««██████¤███¤█",
			"█+███«█☼████╬███ █",
			"█+«~~««♣██¤█§╣%█ █",
			"█++████«█╖╖█§§██%█",
			"███ Θ██╖╖ ██§╣%█+█",
			"██m ██☼█○§██§███3█",
			"█^+██╖§█§§§§§╣(█¤█",
			"██╖+¤m╖╖.███████}█",
			"██+██╖§█♣╖███╖=█{█",
			"██╣██████╖█▣╖╖██♣█",
			"█0~╣█████╖██╖███ █",
			"███╣██☼╖╖♣♣╖♣╖██ █",
			"██√§███╖██╖██╖██ █",
			"██████+╖██╖██╖+█2█",
			"██+╖╖╖♣█+╖♣╖+█1█¤█",
			"████+█████+███ ╖╖█",
			"████████████████)█",
			"██████████████████",
		],
		() => {
			getMessage("Compounding Realm").display();
			realms[3].unlock();
		}
	),
	new Zone(
		"Zone 8",
		[
			"████████████████",
			"███████■☼■██████",
			"███§§¤■§☼§█++♥██",
			"███G███§■§■■■■██",
			"██+^+███■██++███",
			"███2███¤+=██████",
			"███2████+███████",
			"██+++██#G#█δ3δ██",
			"███■███♣.♣123X!█",
			"███δ███■#■█δ3δ██",
			"██¤♣███δδδ██████",
			"████████ █δ█████",
			"█████+╖╖╖╖ ¤████",
			"█████╣██■██~████",
			"██√■█╣██■██δ████",
			"███■1+╖╖╖δδδ████",
			"███¤████████████",
			"███33■■■++++¤███",
			"████████████████",
		],
		() => {
			getMessage("Unlocked Pump Rune").display();
			getRune("Pump").unlock();
		}
	)
];
