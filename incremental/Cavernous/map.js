const xOffset = 9, yOffset = 12;

const originalMap = [
	 '█████████████████████████████████████████████',
	 '█████████████%%██████████████████████████████',
	 '█████████████%#▣&████████████████████████████',
	 '██+██¤#%█¤█████~███###██)#+████+#%#███+██████',
	 '██#█+#####███%%%¤██#█#██####█%██%█%#██%%#████',
	 '██#█ +%#█# #######█#█#██¤█+###█# #+█████g████',
	 '██#█%██#████#██#+#█#█#%███#█###%██%███%%+████',
	 '██%█#█%#█+###█¤#█###█#█████##%█%+███%%%%%████',
	 '██##%█+[██#████ █████#█###█%#██████████ █████',
	 '██%██████████♥###+### ##█#██#¤██+%%##██##████',
	 '█{#+█%# #+███##█##+█████##██ ██%#███%███#████',
	 '█████%█+███¤██#+##█████##██##████%%##¤█%%████',
	 '███%█#█#█.##█¤#####%%# ##+####█¤###████%█████',
	 '███###█#██######█╬⎶████#¤███##████ █%%  █████',
	 '██████###██#¤████████###%█%█%#+███¤██%█ █████',
	 '████%##█##█#█¤#██#¤█+#%#██#█████%%##% █ █████',
	 '██##%##██#█###%=█#███%#####¤█¤#%#███%██ █%███',
	 '██##c%#█#%███████##███g███████#███(#+██ %%███',
	 '████#█#██##+###g##██¤##]███+%~c#███#██%%%%███',
	 '███○#████████h███%+██%###█¤#███##█%#███##████',
	 '███○##%#○%#██~███#####█####%%███#+##%█##%+███',
	 '█████○#█#+%%█h##██+#███"██h████████%███%#%███',
	 '██████+#○██}███##█████████%%#%███████#g#%████',
	 '█████████████¤##%%%+#%███+####¤█████%%██○████',
	 '██████████████%#███##██+███#^#+██████+███████',
	 '█████████████##%%#██##█¤██¤###%██████████████',
	 '█████████████g█%████#m##+████████████████████',
	 '███████████+○~█+█+○~g████████████████████████',
	 '█████████████████████████████████████████████',
];

const classMapping = {
	"█": ["wall", "Solid Rock"],
	"¤": ["mana", "Mana-infused Rock", true, (d, x, y) => `${d} ${mapLocations[y][x].type.nextCost(mapLocations[y][x].completions, mapLocations[y][x].priorCompletions)}`],
	"*": ["mined-mana", "Mana Spring", true, (d, x, y) => `${d} ${mapLocations[y][x].type.nextCost(mapLocations[y][x].completions, mapLocations[y][x].priorCompletions)}`],
	".": ["tunnel", "Dug Tunnel"],
	"#": ["rock", "Rock"],
	"♥": ["clone-machine", "Strange Machine"],
	"+": ["gold", "Gold Ore"],
	"%": ["iron", "Iron Ore"],
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
	"T": ["rune-to", "Teleport To Rune"],
	"F": ["rune-from", "Teleport From Rune"],
	"○": ["coal", "Coal"],
	"g": ["goblin", "Goblin"],
	"c": ["chieftain", "Goblin Chieftain"],
	"h": ["hobgoblin", "Hobgoblin"],
	"m": ["champion", "Goblin Champion"],
};

let map = originalMap.slice();

let mapDirt = [];
let mapStain = [];

let mapLocations = [];

while (mapLocations.length < map.length){
	mapLocations.push([]);
}

function getMapLocation(x, y, adj = false){
	if (!adj && map[y + yOffset][x + xOffset] != "█"){
		getMapLocation(x-1, y-1, true);
		getMapLocation(x, y-1, true);
		getMapLocation(x+1, y-1, true);
		getMapLocation(x-1, y, true);
		getMapLocation(x+1, y, true);
		getMapLocation(x-1, y+1, true);
		getMapLocation(x, y+1, true);
		getMapLocation(x+1, y+1, true);
	}
	x += xOffset;
	y += yOffset;
	if (x < 0 || x >= map[0].length || y < 0 || y >= map.length) return;
	if (!mapLocations[y][x]){
		let mapSymbol = map[y][x];
		mapLocations[y][x] = new Location(x - xOffset, y - yOffset, getLocationTypeBySymbol(mapSymbol));
		classMapping[mapSymbol][2] ? mapStain.push([x, y]) : mapDirt.push([x, y]);
	}
	return mapLocations[y][x];
}

function hasMapLocation(x, y) {
	return mapLocations[y] && mapLocations[y][x] != undefined;
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
	for (let y = 0; y < map.length; y++){
		mapNodes[y] = [];
		let rowNode = rowTemplate.cloneNode(true);
		rowNode.removeAttribute("id");
		mapNode.append(rowNode);
		if (mapLocations[y]){
			for (let x = 0; x < map[y].length; x++){
				let cellNode = cellTemplate.cloneNode(true);
				cellNode.removeAttribute("id");
				cellNode.setAttribute("data-x", x);
				cellNode.setAttribute("data-y", y);
				if (mapLocations[y][x]) {
					let [className, descriptor, isStained, descriptorMod] = classMapping[map[y][x]];
					className = className.split(" ");
					for (let i = 0; i < className.length; i++){
						cellNode.classList.add(className[i]);
					}
					cellNode.setAttribute("data-content", descriptorMod ? descriptorMod(descriptor, x, y) : descriptor);
				} else {
					cellNode.classList.add("blank");
				}
				rowNode.append(cellNode);
				mapNodes[y][x] = cellNode;
			}
		}
	}
	isDrawn = true;
	for (let i = 0; i < clones.length; i++){
		let clone = clones[i];
		let node = mapNodes[clone.y + yOffset][clone.x + xOffset];
		node.classList.add("occupied");
		clone.occupiedNode = node;
	}
}

let isDrawn = false;

function drawCell(x, y) {
	let cell = mapNodes[y][x];
	let [className, descriptor, isStained, descriptorMod] = classMapping[map[y][x]];
	cell.className = className;
	cell.setAttribute("data-content", descriptorMod ? descriptorMod(descriptor, x, y) : descriptor);
}

let mapNode;

function drawMap() {
	if (!isDrawn) drawNewMap();
	
	mapDirt.forEach(([x,y])=>drawCell(x, y));
	mapDirt = [];
	mapStain.forEach(([x,y])=>drawCell(x, y));
	
	mapNode = mapNode || document.querySelector("#map-inner");
	clampMap();
	for (let i = 0; i < clones.length; i++){
		let clone = clones[i];
		clone.occupiedNode && clone.occupiedNode.classList.remove("occupied");
		let node = mapNodes[clone.y + yOffset][clone.x + xOffset];
		node.classList.add("occupied");
		clone.occupiedNode = node;
	}
	showFinalLocation(true);
}

function clampMap() {
	let xMin = 999;
	let xMax = -999;
	let yMin = 999;
	let yMax = -999;
	for (let y = 0; y < mapLocations.length; y++) {
		for (let x = 0; x < mapLocations[y].length; x++) {
			if (mapLocations[y][x]) {
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
	x += xOffset;
	y += yOffset;
	let old = map[y][x];
	let tile = icon || {
		"#": ".",
		"¤": "*",
		"+": ".",
		"%": ".",
		" ": ".",
		"g": ".",
		"○": ".",
		"c": ".",
		"h": ".",
	}[old] || old;
	map[y] = map[y].slice(0, x) + tile + map[y].slice(x + 1);
	if (tile !== old) {
		mapDirt.push([x, y]);
	}
}

function viewCell(e){
	let x = e.target.getAttribute("data-x"), y = e.target.getAttribute("data-y");
	let type = [...e.target.classList].find(x => x !== "occupied" && x !== "final-location");
	if (mapLocations[y] && mapLocations[y][x]){
		let location = mapLocations[y][x];
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
					document.querySelector("#location-next").innerHTML = `Next: ${type.nextCost(location.completions, location.priorCompletions)}`;
				} else if (primaryAction) {
					document.querySelector("#location-next").innerHTML = `Time: ${writeNumber(primaryAction.getDuration() / 1000, 2)}s`;
				} else {
					document.querySelector("#location-next").innerHTML = "";
				}
				let xValue = x - xOffset, yValue = y - yOffset;
				if ((type.name == "Mana-infused Rock" || type.name == "Mana Spring")) {
					q("#location-route").hidden = true;
					let route = getBestRoute(xValue, yValue);
					if (route) {
						route.showOnLocationUI();
					} else {
						q("#route-has-route").hidden = true;
						q("#route-not-visited").hidden = true;
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

function getMapTile(x, y) {
	return map[y] && map[y][x];
}

function resetMap() {
	mapLocations.forEach((ml, y) => {
		ml.forEach((l, x) => {
			l.reset();
			mapDirt.push([x, y]);
		});
	})
	map = originalMap.slice();
}