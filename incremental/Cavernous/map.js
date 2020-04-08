
let map = ['███████████████████████████████████████████',
           '█████████████%%████████████████████████████',
           '█████████████%#▣&██████████████████████████',
           '██+██¤#%█¤█████~███###██)#+████+#%#████████',
           '██#█+#####███%%%¤██#█#██####█%██%█%#███████',
           '██#█ +%#█# #######█#█#██¤█+###█# #+████████',
           '██#█%██#████#██#+#█#█#%███#█###%██%████████',
           '██%█#█%#█+###█¤#█###█#█████##%█%+██████████',
           '██##%█+[██#████ █████#█###█%#██████████████',
           '██%██████████♥###+### ##█#██#¤██+%%##██████',
           '█{#+█%# #+███##█##+█████##██ ██%#███%██████',
           '█████%█+███¤██#+##█████##██##████%%##¤█████',
           '███%█#█#█.##█¤#####%%# ##+####█¤###████████',
           '███###█#██######█╬⎶████#¤███##████ ████████',
           '██████###██#¤████████###%█%█%#+███¤████████',
           '████%##█##█#█¤#██#¤█+#%#██#█████%%##%██████',
           '██##%##██#█###%=█#███%#####¤█¤#%#███%██████',
           '██##c%#█#%███████##███g███████#███(#+██████',
           '████#█#██##+###g##██¤##]███+%~c#███#███████',
           '███○#████████████%+██%###█¤#███##█%#███████',
           '███○##%#○%#██████#####█####%%███#+##%██████',
           '█████○#█#+%%██████+#███"██h████████%███████',
           '██████+#○██}██████████████%%#%█████████████',
           '█████████████████████████+####¤████████████',
           '███████████████████████████#^#+████████████',
           '██████████████████████████¤###%████████████',
           '███████████████████████████████████████████',
];

let originalMap = map.slice();

let xOffset = 9, yOffset = 12;

let mapLocations = [];

let classMapping = {
	"█": ["wall", "Solid Rock"],
	"¤": ["mana", "Mana-infused Rock"],
	"*": ["mined-mana", "Mana Spring"],
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
};

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
	}
	return mapLocations[y][x];
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
					let [className, descriptor] = classMapping[map[y][x]];
					className = className.split(" ");
					for (let i = 0; i < className.length; i++){
						cellNode.classList.add(className[i]);
					}
					cellNode.setAttribute("data-content", descriptor);
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
		mapNode.childNodes[clones[i].y + yOffset].childNodes[clones[i].x + xOffset].classList.add("occupied");
	}
}

let isDrawn = false;

function drawCell(x, y) {
	if (!mapLocations[y][x]) return;
	let cell = mapNodes[y][x];
	let [className, descriptor] = classMapping[map[y][x]];
	if (cell.className != className){
		cell.className = "";
		className = className.split(" ");
		for (let i = 0; i < className.length; i++){
			cell.classList.add(className[i]);
		}
		if (descriptor == "Mana Spring" || descriptor == "Mana-infused Rock"){
			descriptor += " " + mapLocations[y][x].type.nextCost(mapLocations[y][x].completions, mapLocations[y][x].priorCompletions);
		}
		cell.setAttribute("data-content", descriptor);
	} else if (descriptor == "Mana Spring" || descriptor == "Mana-infused Rock"){
		descriptor += " " + mapLocations[y][x].type.nextCost(mapLocations[y][x].completions, mapLocations[y][x].priorCompletions);
		cell.setAttribute("data-content", descriptor);
	}
}

function drawMap() {
	if (!isDrawn) drawNewMap();
	for (let y = 0; y < mapNodes.length; y++){
		if (!mapLocations[y]) continue;
		for (let x = 0; x < mapNodes[y].length; x++){
			drawCell(x, y);
		}
	}
	let mapNode = document.querySelector("#map-inner");
	document.querySelectorAll(".occupied").forEach(el => el.classList.remove("occupied"));
	for (let i = 0; i < clones.length; i++){
		mapNode.childNodes[clones[i].y + yOffset].childNodes[clones[i].x + xOffset].classList.add("occupied");
	}
	showFinalLocation(true);
}

function setMined(x, y, icon){
	x += xOffset;
	y += yOffset;
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
	}[map[y][x]] || map[y][x];
	map[y] = map[y].slice(0, x) + tile + map[y].slice(x + 1);
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
				if ((type.name == "Mana-infused Rock" || type == "Mana Spring") && getBestRoute(xValue, yValue)){
					document.querySelector("#location-route").style.display = "block";
					document.querySelector("#x-loc").value = x - xOffset;
					document.querySelector("#y-loc").value = y - yOffset;
				} else {
					document.querySelector("#location-route").style.display = "none";
				}
				return;
			}
		}
	}
}