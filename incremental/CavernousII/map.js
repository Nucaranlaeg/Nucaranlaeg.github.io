const classMapping = {
	"█": ["wall", "Solid Rock"],
	"¤": ["mana", "Mana-infused Rock", true, (d, x, y) => `${d} ${zones[displayZone].mapLocations[y][x].type.nextCost(zones[displayZone].mapLocations[y][x].completions, zones[displayZone].mapLocations[y][x].priorCompletions, zones[displayZone], x - zones[displayZone].xOffset, y - zones[displayZone].yOffset)}`],
	"*": ["mined-mana", "Mana Spring", true, (d, x, y) => `${d} ${zones[displayZone].mapLocations[y][x].type.nextCost(zones[displayZone].mapLocations[y][x].completions, zones[displayZone].mapLocations[y][x].priorCompletions, zones[displayZone], x - zones[displayZone].xOffset, y - zones[displayZone].yOffset)}`],
	".": ["tunnel", "Dug Tunnel"],
	"#": ["limestone", "Limestone"], // Mohs 3
	"«": ["travertine", "Travertine"], // Mohs 6
	"╖": ["granite", "Granite"], // Mohs 5
	"???": ["basalt", "Basalt"], // Mohs 6, unused
	"????": ["chert", "Chert"], // Mohs 7, unused
	"♥": ["clone-machine", "Strange Machine"],
	"+": ["gold", "Gold Ore"],
	"%": ["iron", "Iron Ore"],
	"░": ["salt", "Salt"],
	"╬": ["furnace", "Furnace"],
	"▣": ["furnace2", "Steel Furnace"],
	"=": ["vaporizer", "Vaporizer"],
	"⎶": ["bridge", "Anvil - Bridge"],
	"&": ["bridge2", "Anvil - Upgrade Bridge"],
	" ": ["pit", "Bottomless Pit"],
	"~": ["lava", "Bottomless Lava"],
	'"': ["book", "Book"],
	")": ["sword", "Anvil - Sword"],
	"[": ["shield", "Anvil - Shield"],
	"]": ["armour", "Anvil - Armour"],
	"(": ["sword2", "Anvil - Upgrade Sword"],
	"{": ["shield2", "Anvil - Upgrade Shield"],
	"}": ["armour2", "Anvil - Upgrade Armour"],
	"^": ["fountain", "Fountain"],
	"W": ["rune-weak", "Weaken Rune"],
	"H": ["rune-wither", "Wither Rune"],
	"T": ["rune-to", "Teleport To Rune"],
	"F": ["rune-from", "Teleport From Rune"],
	"D": ["rune-dup", "Duplication Rune"],
	"d": ["rune-dup-charged", "Duplication Rune"],
	"○": ["coal", "Coal"],
	"g": ["goblin", "Goblin"],
	"c": ["chieftain", "Goblin Chieftain"],
	"h": ["hobgoblin", "Hobgoblin"],
	"m": ["champion", "Goblin Champion"],
	"Θ": ["zone", "Zone Portal"],
	"√": ["goal", "Goal"],
	"♠": ["mushroom", "Mushroom"],
	"♣": ["kudzushroom", "Kudzushroom"],
	"α": ["sporeshroom", "Sporeshroom"],
	"¢": ["axe", "Anvil - Axe"],
	"¥": ["pick", "Anvil - Pick"],
	"£": ["hammer", "Anvil - Hammer"],
	"0": ["spring", "Spring"],
};

// The tiles that can be pathfinded through.
const walkable = "*.♥╬▣=⎶&\"()[]{}^WHTFDd¢¥£";

let mapDirt = [];
let mapStain = [];

let visibleX = null, visibleY = null;

// Not a view function; consider moving.
function getMapLocation(x, y, adj = false, zone = null){
	if (zone !== null){
		return zones[zone].getMapLocation(x, y, adj);
	}
	return zones[currentZone].getMapLocation(x, y, adj);
}

let mapNodes = [];

function drawNewMap() {
	mapNodes = [];
	let mapNode = document.querySelector("#map-inner");
	while (mapNode.firstChild){
		mapNode.removeChild(mapNode.lastChild);
	}
	let rowTemplate = document.querySelector("#row-template");
	let cellTemplate = document.querySelector("#cell-template");
	for (let y = 0; y < zones[displayZone].map.length; y++){
		mapNodes[y] = [];
		let rowNode = rowTemplate.cloneNode(true);
		rowNode.removeAttribute("id");
		mapNode.append(rowNode);
		if (zones[displayZone].mapLocations[y]){
			for (let x = 0; x < zones[displayZone].map[y].length; x++){
				let cellNode = cellTemplate.cloneNode(true);
				cellNode.removeAttribute("id");
				cellNode.setAttribute("data-x", x);
				cellNode.setAttribute("data-y", y);
				if (zones[displayZone].mapLocations[y][x]) {
					let [className, descriptor, isStained, descriptorMod] = classMapping[zones[displayZone].map[y][x]];
					className = className.split(" ");
					for (let i = 0; i < className.length; i++){
						cellNode.classList.add(className[i]);
					}
					cellNode.setAttribute("data-content", descriptorMod ? descriptorMod(descriptor, x, y) : descriptor);
					if (location.water > 0.1) {
						cell.classList.add(`watery-${Math.floor(location.water * 10)}`);
					}
				} else {
					cellNode.classList.add("blank");
				}
				rowNode.append(cellNode);
				mapNodes[y][x] = cellNode;
			}
		}
	}
	isDrawn = true;
	displayClones();
	mapStain = [];
}

let isDrawn = false;

function drawCell(x, y) {
	let cell = (mapNodes[y] || [])[x];
	if (!cell) return;
	let location = zones[displayZone].mapLocations[y][x];
	if (!location) return;
	let [className, descriptor, isStained, descriptorMod] = classMapping[zones[displayZone].map[y][x]];
	cell.className = className;
	if (location.water > 0.1) {
		cell.classList.add(`watery-${Math.floor(location.water * 10)}`);
	}
	cell.setAttribute("data-content", descriptorMod ? descriptorMod(descriptor, x, y) : descriptor);
}

let mapNode;

function drawMap() {
	if (!isDrawn) drawNewMap();
	
	if (currentZone == displayZone){
		mapDirt.forEach(([x,y]) => drawCell(x, y));
		mapDirt = [];
		mapStain.forEach(([x,y]) => drawCell(x, y));
	}

	mapNode = mapNode || document.querySelector("#map-inner");
	clampMap();
	displayClones();
	showFinalLocation(true);
}

function displayClones(){
	if (currentZone == displayZone){
		for (let i = 0; i < clones.length; i++){
			let clone = clones[i];
			clone.occupiedNode && clone.occupiedNode.classList.remove("occupied");
			let node = mapNodes[clone.y + zones[displayZone].yOffset][clone.x + zones[displayZone].xOffset];
			node.classList.add("occupied");
			clone.occupiedNode = node;
		}
	}
}

function clampMap() {
	let xMin = 999;
	let xMax = -999;
	let yMin = 999;
	let yMax = -999;
	for (let y = 0; y < zones[displayZone].mapLocations.length; y++) {
		for (let x = 0; x < zones[displayZone].mapLocations[y].length; x++) {
			if (zones[displayZone].mapLocations[y][x]) {
				xMin = Math.min(xMin, x);
				xMax = Math.max(xMax, x);
				yMin = Math.min(yMin, y);
				yMax = Math.max(yMax, y);
			}
		}
	}

	for (let y = 0; y < mapNodes.length; y++) {
		for (let x = 0; x < mapNodes[y].length; x++) {
			let node = mapNodes[y][x];
			let toHide = xMin > x || x > xMax || yMin > y || y > yMax;
			if (node.hidden != toHide) {
				node.hidden = toHide;
			}
		}
	}

	let size = Math.max(xMax - xMin + 1, yMax - yMin + 1);
	size = yMax - yMin + 1;
	let scale = Math.floor(440 / size);
	mapNode.style.setProperty("--cell-count", size + "px");
	mapNode.style.setProperty("--cell-size", scale + "px");
}

function setMined(x, y, icon){
	x += zones[currentZone].xOffset;
	y += zones[currentZone].yOffset;
	let old = zones[currentZone].map[y][x];
	let tile = icon || {
		"#": ".",
		"♠": ".",
		"α": ".",
		"«": ".",
		"¤": "*",
		"+": ".",
		"%": ".",
		" ": ".",
		"g": ".",
		"○": ".",
		"c": ".",
		"h": ".",
		"m": ".",
		"√": ".",
		"░": ".",
		"╖": ".",
	}[old] || old;
	zones[currentZone].map[y] = zones[currentZone].map[y].slice(0, x) + tile + zones[currentZone].map[y].slice(x + 1);
	if (tile !== old) {
		mapDirt.push([x, y]);
	}
}

function viewCell(e){
	let x = e.target.getAttribute("data-x"), y = e.target.getAttribute("data-y");
	let type = [...e.target.classList].find(x => x !== "occupied" && x !== "final-location");
	if (zones[displayZone].mapLocations[y] && zones[displayZone].mapLocations[y][x]){
		let location = zones[displayZone].mapLocations[y][x];
		for (const icon in classMapping){
			if (classMapping[icon][0] == type){
				type = getLocationType(getLocationTypeBySymbol(icon));
				let primaryAction = type.presentAction || type.enterAction;
				document.querySelector("#location-name").innerHTML = type.name;
				let description = type.description;
				if (description.includes("{STATS}")){
					let statsDesc = `Attack: ${location.creature.attack}\nDefense: ${location.creature.defense}\nHealth: ${location.creature.health}`;
					description = description.replace("{STATS}", statsDesc);
				}
				document.querySelector("#location-description").innerHTML = description.replace(/\n/g, "<br>");
				if (type.nextCost){
					document.querySelector("#location-next").innerHTML = `Next: ${type.nextCost(location.completions, location.priorCompletions, location.zone, x - zones[displayZone].xOffset, y - zones[displayZone].yOffset)}`;
				} else if (primaryAction) {
					document.querySelector("#location-next").innerHTML = `Time: ${writeNumber(primaryAction.getProjectedDuration() / 1000, 2)}s`;
				} else {
					document.querySelector("#location-next").innerHTML = "";
				}
				if (location.water) {
					document.querySelector("#location-water").innerHTML = `Water level: ${writeNumber(location.water, 2)}`;
				} else {
					document.querySelector("#location-water").innerHTML = "";
				}
				visibleX = x - zones[displayZone].xOffset;
				visibleY = y - zones[displayZone].yOffset;
				if ((type.name == "Mana-infused Rock" || type.name == "Mana Spring")) {
					document.querySelector("#location-route").hidden = true;
					let route = getBestRoute(visibleX, visibleY, displayZone);
					if (route) {
						route.showOnLocationUI();
					} else {
						document.querySelector("#route-has-route").hidden = true;
						document.querySelector("#route-not-visited").hidden = true;
					}
				} else {
					document.querySelector("#location-route").hidden = true;
				}

				return;
			}
		}
	}
}

function getMapNode(x, y) {
	return mapNodes[y] && mapNodes[y][x];
}

function getOffsetMapNode(x, y) {
	return getMapNode(x + zones[displayZone].xOffset, y + zones[displayZone].yOffset);
}

function getMapTile(x, y) {
	return zones[displayZone].map[y] && zones[displayZone].map[y][x];
}

function displayCreatureHealth(creature){
	if (currentZone != displayZone) return;
	let node = getOffsetMapNode(creature.x, creature.y);
	if (!node) return;
	if (creature.health > 0 && creature.health < creature.creature.health){
		node.innerHTML = `<div class="enemy-hp" style="width:${Math.floor(creature.health / creature.creature.health * 100)}%"></div>`;
	} else {
		node.innerHTML = "";
	}
}