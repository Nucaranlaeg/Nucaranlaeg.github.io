let possibleActionIcons = ["★", "✣", "✦", "♣", "♠", "⚑", "×", "⬈", "⬉", "⬊", "⬋"];

let version = document.querySelector("#version").innerText.split(".").map((e, i) => parseInt(e, 36) / 100 ** i).reduce((v, e) => v + e);
let previousVersion;


/******************************************** Functions ********************************************/

let skipActionComplete = false;

function getNextAction(clone = currentClone) {
	let index = queues[clone].findIndex(a => a[1]);
	let action = queues[clone][index];
	if (!action) return [undefined, index];
	if (action[0][0] == "Q" && action[2].length == 0){
		// If there are no actions in the saved queue, skip it.
		action[1] = false;
		return getNextAction(clone);
	}
	action.setCaller(clone, index);
	return [action, index];
}

function completeNextAction(force) {
	if (skipActionComplete){
		skipActionComplete = false;
		return;
	}
	let index = queues[currentClone].findIndex(a => a[1]);
	let action = queues[currentClone][index];
	clones[currentClone].currentCompletions = null;
	if (!action) return;
	action.complete(force);
}

function getLocationType(name) {
	return locationTypes.find(a => a.name == name);
}

function getLocationTypeBySymbol(symbol) {
	return locationTypes.find(a => a.symbol == symbol).name;
}

function getMessage(name) {
	return messages.find(a => a.name == name);
}

function getCreature(search) {
	if (typeof(search) == "string") {
		return baseCreatures.find(a => a.name == search);
	} else {
		return creatures.find(c => c.x == search[0] && c.y == search[1]);
	}
}

function writeNumber(value, decimals = 0) {
	if (value > 100) decimals = Math.min(decimals, 1);
	return value.toFixed(decimals);
}

function writeTime(value) {
	if (value == Infinity) return "Infinity";
	let hours = Math.floor(value / 3600);
	hours = `${hours ? `${hours}:` : ""}`
	let minutes = Math.floor((value % 3600) / 60);
	minutes = minutes || hours ? (minutes > 9 ? `${minutes}:` : `0${minutes}:`) : "";
	let seconds = Math.floor((value % 60) * 10) / 10;
	if (value > 100 * 3600) seconds = Math.floor(seconds);
	seconds = seconds < 10 && minutes ? `0${seconds.toFixed(value > 100 * 3600 ? 0 : 1)}` : seconds.toFixed(value > 100 * 3600 ? 0 : 1);
	return `${hours}${minutes}${seconds}`;
}

let timeBankNode;

function redrawOptions() {
	timeBankNode = timeBankNode || document.querySelector("#time-banked");
	timeBankNode.innerText = writeTime(timeBanked / 1000);
}

window.ondrop = e => e.preventDefault();

/******************************************** Prestiges ********************************************/

function resetLoop() {
	let mana = getStat("Mana");
	if (getMessage("Time Travel").display(zones[0].manaGain == 0 && realms[currentRealm].name == "Core Realm")) setSetting(toggleAutoRestart, 3);
	if (mana.base == 5.5) getMessage("The Looping of Looping Loops").display() && setSetting(toggleAutoRestart, 1);
	if (mana.base == 6) getMessage("Strip Mining").display();
	if (mana.base == 7.4) getMessage("Buy More Time").display();
	if (routes.length == 3) getMessage("All the known ways").display() && setSetting(toggleGrindMana, true);
	stats.forEach((s, i) => {
		GrindRoute.updateBestRoute(s.name, s.current - loopStatStart[i]);
		s.reset();
		s.update();
	});
	if (settings.grindMana && routes) {
		Route.loadBestRoute();
	}
	stuff.forEach(s => {
		s.count = 0;
		s.update();
	});
	clones.forEach(c => c.reset());
	queueTime = 0;
	loopCompletions = 0;
	currentActionDetails = null;
	savedQueues = savedQueues.map(q => {
		let [name, icon, colour] = [q.name, q.icon, q.colour];
		q = q.map(a => [a[0]]);
		q.name = name;
		q.icon = icon;
		q.colour = colour;
		return q;
	});
	creatures.forEach(c => {
		c.attack = c.creature.attack;
		c.defense = c.creature.defense;
		c.health = c.creature.health;
		c.drawHealth();
	});
	zones.forEach(z => {
		z.resetZone();
		(z.queues || []).forEach((q, i) => {
			q.forEach(a => {
				a[1] = true;
				a[2] = undefined;
			});
		});
	});
	updateRunes();
	updateSpells(this.base);
	moveToZone(0, false);
	getStat("Mana").dirty = true;
	getStat("Mana").update();
	drawMap();
	save();
	showFinalLocation();
	if (isNaN(timeBanked)){
		timeBanked = 0;
	}
	setStartData();
}

let loopActions = {};
let loopStatStart = [];
let loopLogVisible = false;
const loopLogBox = document.querySelector("#loop-log-box");
const logEntryTemplate = document.querySelector("#log-entry-template");
logEntryTemplate.removeAttribute("id");

function setStartData(){
	loopActions = {};
	loopStatStart = stats.map(s => s.base);
}

function displayLoopLog(){
	loopLogBox.hidden = false;
	loopLogVisible = true;
	let loopActionNode = loopLogBox.querySelector("#loop-actions");
	let loopStatNode = loopLogBox.querySelector("#loop-stats");
	while (loopActionNode.firstChild){
		loopActionNode.removeChild(loopActionNode.lastChild);
	}
	while (loopStatNode.firstChild){
		loopStatNode.removeChild(loopStatNode.lastChild);
	}
	let actions = Object.entries(loopActions);
	actions = actions.sort((a, b) => b[1] - a[1]);
	let totalActionNode = logEntryTemplate.cloneNode(true);
	totalActionNode.querySelector(".name").innerHTML = "Total clone-seconds";
	totalActionNode.querySelector(".value").innerHTML = writeNumber(actions.reduce((a, c) => a + c[1], 0) / 1000, 1);
	totalActionNode.style.fontWeight = "bold";
	loopActionNode.append(totalActionNode);
	let totalStatNode = logEntryTemplate.cloneNode(true);
	totalStatNode.querySelector(".name").innerHTML = "Total stats gained";
	totalStatNode.style.fontWeight = "bold";
	loopStatNode.append(totalStatNode);
	for (let i = 0; i < actions.length; i++){
		let node = logEntryTemplate.cloneNode(true);
		node.classList.add(actions[i][0].replace(/ /g, '-'));
		node.querySelector(".name").innerHTML = actions[i][0];
		node.querySelector(".value").innerHTML = writeNumber(actions[i][1] / 1000, 1);
		loopActionNode.append(node);
		node.style.color = setRGBContrast(window.getComputedStyle(node).backgroundColor);
	}
	let totalStats = 0;
	for (let i = 0; i < loopStatStart.length; i++){
		if (stats[i].name == "Mana") continue;
		if (loopStatStart[i] == stats[i].base) continue;
		let node = logEntryTemplate.cloneNode(true);
		node.querySelector(".name").innerHTML = stats[i].name;
		node.querySelector(".value").innerHTML = writeNumber(stats[i].base - loopStatStart[i], 3);
		totalStats += stats[i].base - loopStatStart[i];
		loopStatNode.append(node);
	}
	totalStatNode.querySelector(".value").innerHTML = writeNumber(totalStats, 3);
}

function hideLoopLog(){
	loopLogBox.hidden = true;
	loopLogVisible = false;
}

/********************************************* Saving *********************************************/

let URLParams = (new URL(document.location)).searchParams;
let saveName = URLParams.get('save') || '';
saveName = `saveGameII${saveName && '_'}${saveName}`;
let savingDisabled = URLParams.get('saving') == 'disabled';

function save(){
	if (savingDisabled) return;
	let playerStats = stats.map(s => {
		return {
			"name": s.name,
			"base": s.base,
		};
	});
	let zoneData = zones.map(zone => {
		let zoneLocations = [];
		for (let y = 0; y < zone.mapLocations.length; y++){
			for (let x = 0; x < zone.mapLocations[y].length; x++){
				if (zone.mapLocations[y][x]){
					let loc = zone.mapLocations[y][x];
					zoneLocations.push([x - zone.xOffset, y - zone.yOffset, loc.priorCompletionData]);
				}
			}
		}
		return {
			"name": zone.name,
			"locations": zoneLocations,
			"queues": zone.queues ? zone.queues.map(queue => {
				return queue.map(q => {
					return q[0];
				});
			}) : [[]],
			"routes": zone.routes,
			"goal": zone.goalComplete,
		};
	})
	let cloneData = {
		"count": clones.length,
	};
	let stored = savedQueues.map(q => {
		return {
			"queue": q,
			"name": q.name,
			"icon": possibleActionIcons.indexOf(q.icon),
			"colour": q.colour,
		};
	});
	let time = {
		"saveTime": Date.now(),
		"timeBanked": timeBanked,
	}
	let messageData = messages.map(m => [m.name, m.displayed]);
	let savedRoutes = JSON.parse(JSON.stringify(routes, ((key, value) => {
		if (key == "usedRoutes") return undefined;
		return value;
	})));
	let savedGrindRoutes = JSON.parse(JSON.stringify(grindRoutes, ((key, value) => {
		if (key == "usedRoutes") return undefined;
		return value;
	})));
	let runeData = runes.map(r => {
		return {
			"name": r.name,
			"upgradeCount": r.upgradeCount,
		};
	});
	saveString = JSON.stringify({
		version,
		playerStats,
		zoneData,
		currentRealm,
		cloneData,
		stored,
		time,
		messageData,
		settings,
		routes: savedRoutes,
		grindRoutes: savedGrindRoutes,
		runeData,
	});
	localStorage[saveName] = LZString.compressToBase64(saveString);
}

function load(){
	if (!localStorage[saveName]) return setup();
	let saveGame;
	try {
		saveGame = JSON.parse(LZString.decompressFromBase64(localStorage[saveName]));
	} catch {
		// Prior to 2.2.6
		saveGame = JSON.parse(atob(localStorage[saveName]));
	}
	if (!saveGame.routes) saveGame.routes = JSON.parse(saveGame.savedRoutes);
	previousVersion = saveGame.version || 2;
	if (version < previousVersion) {
		alert(`Error: Version number reduced!\n${previousVersion} -> ${version}`);
	}

	stats.forEach(s => s.current = 0);
	for (let i = 0; i < saveGame.playerStats.length; i++){
		getStat(saveGame.playerStats[i].name).base = saveGame.playerStats[i].base;
	}
	for (let i = 0; i < saveGame.messageData.length; i++){
		let message = getMessage(saveGame.messageData[i][0]);
		if (message){
			message.displayed = saveGame.messageData[i][1];
		}
	}
	for (let i = 0; i < saveGame.zoneData.length; i++){
		let zone = zones.find(z => z.name == saveGame.zoneData[i].name);
		for (let j = 0; j < saveGame.zoneData[i].locations.length; j++){
			let zoneLocation = zone.getMapLocation(saveGame.zoneData[i].locations[j][0], saveGame.zoneData[i].locations[j][1], true);
			zoneLocation.priorCompletionData = saveGame.zoneData[i].locations[j][2];
			while (zoneLocation.priorCompletionData.length < realms.length) zoneLocation.priorCompletionData.push(0);
		}
		zone.queues = ActionQueue.fromJSON(saveGame.zoneData[i].queues);
		zone.routes = ZoneRoute.fromJSON(saveGame.zoneData[i].routes);
		// Challenge for < 2.0.6
		if (saveGame.zoneData[i].goal || saveGame.zoneData[i].challenge) zone.completeGoal();
	}
	for (let i = 0; i < realms.length; i++){
		currentRealm = i;
		recalculateMana();
	}
	clones = [];
	while (clones.length < saveGame.cloneData.count){
		Clone.addNewClone(true);
	}
	savedQueues = [];
	for (let i = 0; i < saveGame.stored.length; i++){
		savedQueues.push(saveGame.stored[i].queue);
		savedQueues[i].name = saveGame.stored[i].name;
		savedQueues[i].icon = possibleActionIcons[saveGame.stored[i].icon];
		savedQueues[i].colour = saveGame.stored[i].colour;
	}
	ensureLegalQueues();
	lastAction = saveGame.time.saveTime;
	timeBanked = +saveGame.time.timeBanked;
	if (saveGame.routes){
		routes = Route.fromJSON(saveGame.routes);
	}
	if (saveGame.grindRoutes){
		grindRoutes = GrindRoute.fromJSON(saveGame.grindRoutes);
	}
	for (let i = 0; i < (saveGame.runeData || []).length; i++){
		runes[i].upgradeCount = saveGame.runeData[i].upgradeCount || 0;
	}
	
	loadSettings(saveGame.settings);
	
	selectClone(0);
	queuesNode = queuesNode || document.querySelector("#queues");
	redrawQueues();
	
	// Fix attack and defense
	getStat("Attack").base = 0;
	getStat("Defense").base = 0;
	stats.map(s => s.update());
	
	changeRealms(saveGame.currentRealm);
	
	drawMap();

	applyCustomStyling();
}

function ensureLegalQueues(){
	for (let i = 0; i < queues.length; i++){
		if (queues[i].some(q => q[0] == "Q" && getActionValue(q[0]) >= savedQueues.length)){
			queues[i] = [];
		}
	}
	for (let i = 0; i < savedQueues.length; i++){
		if (savedQueues[i].some(q => q[0] == "Q" && getActionValue(q[0]) >= savedQueues.length)){
			savedQueues[i].queue = [];
		}
	}
}

function deleteSave(){
	if (localStorage[saveName]) localStorage[saveName + "Backup"] = localStorage[saveName];
	localStorage.removeItem(saveName);
	window.location.reload();
}

function exportGame(){
	navigator.clipboard.writeText(localStorage[saveName]);
}

function importGame(){
	let saveString = prompt("Input your save");
	if (!saveString) return;
	save();
	save = () => {};
	let temp = localStorage[saveName];
	localStorage[saveName] = saveString;
	try {
		let queueNode = document.querySelector(`#queues`);
		queueNode.innerHTML = "";
		queues = [];
		load();
	} catch {
		queues = [];
		localStorage[saveName] = temp;
		load();
	}
	window.location.reload();
}


/******************************************** Game loop ********************************************/

let lastAction = Date.now();
let timeBanked = 0;
let queueTime = 0;
let queuesNode;
let queueTimeNode, queueActionNode;
let currentClone = 0;
let loopCompletions = 0;
let fps = 60;
let shouldReset = false;

setInterval(function mainLoop() {
	if (shouldReset){
		resetLoop();
		shouldReset = false;
	}
	let time = Date.now() - lastAction;
	let mana = getStat("Mana");
	queuesNode = queuesNode || document.querySelector("#queues");
	if (isNaN(mana.current) && settings.running) toggleRunning();
	lastAction = Date.now();
	if (mana.current == 0 || clones.every(c => c.damage === Infinity)){
		queuesNode.classList.add("out-of-mana");
		getMessage("Out of Mana").display();
		if (settings.autoRestart == 2 || (settings.autoRestart == 1 && clones.every(c => c.repeated))){
			resetLoop();
		}
	} else {
		queuesNode.classList.remove("out-of-mana");
	}
	if (settings.autoRestart == 2 && clones.every(c => c.noActionsAvailable || c.damage == Infinity)){
		queuesNode.classList.remove("out-of-mana");
		resetLoop();
	}
	if (!settings.running ||
			mana.current == 0 ||
			(settings.autoRestart == 0 && queues.some((q, i) => getNextAction(i)[0] === undefined && (q[q.length - 1] || [""])[0] !== "=")) ||
			(settings.autoRestart == 3 && queues.every((q, i) => getNextAction(i)[0] === undefined || clones[i].damage == Infinity) && clones.some(c => c.damage < Infinity)) ||
			!messageBox.hidden) {
		if (!isNaN(time / 1)) timeBanked += time;
		redrawOptions();
		updateDropTarget();
		return;
	}
	let timeAvailable = time;
	if (settings.usingBankedTime && timeBanked > 0){
		let speedMultiplier = 3 + mana.base / 5;
		let speedCap = settings.debug_speedMultiplier || 10;
		timeAvailable = Math.min(time + timeBanked, time * Math.min(speedMultiplier, speedCap));
	}
	if (timeAvailable > 1000) {
		timeAvailable = 1000;
	}
	if (timeAvailable > mana.current * 1000){
		timeAvailable = mana.current * 1000;
	}
	if (timeAvailable < 0) {
		timeAvailable = 0;
	}
	let timeLeft = timeAvailable;

	timeLeft = Clone.performActions(timeAvailable);
	let timeUsed = timeAvailable - timeLeft;
	zones[currentZone].tick(timeUsed);

	if (timeUsed > time && !isNaN(timeUsed - time)) {
		timeBanked -= timeUsed - time;
		if (timeBanked <= 0) timeBanked = 0;
	} else if (!isNaN((time - timeUsed) / 2)){
		timeBanked += (time - timeUsed) / 2;
	}
	if (timeLeft && (settings.autoRestart == 1 || settings.autoRestart == 2)){
		resetLoop();
	}
	queueTimeNode = queueTimeNode || document.querySelector("#time-spent");
	queueTimeNode.innerText = writeNumber(queueTime / 1000, 1);
	queueActionNode = queueActionNode || document.querySelector("#actions-spent");
	queueActionNode.innerText = `${writeNumber(loopCompletions, 0)} (x${writeNumber(1 + loopCompletions / 40, 3)})`;
	redrawOptions();
	updateDropTarget();

	stats.forEach(e => e.update());
	drawMap();
	if (loopLogVisible) displayLoopLog();
}, Math.floor(1000 / fps));

function setup(){
	Clone.addNewClone();
	zones[0].enterZone();
	selectClone(0);
	getMapLocation(0,0);
	drawMap();
	getMessage("Welcome to Cavernous!").display();
	if (URLParams.has('timeless')) {
		timeBanked = Infinity;
		settings.debug_speedMultiplier = 50;
	}
}

/****************************************** Key Bindings ******************************************/

let keyFunctions = {
	"ArrowLeft": () => {
		addActionToQueue("L");
	},
	"ArrowUp": () => {
		addActionToQueue("U");
	},
	"ArrowRight": () => {
		addActionToQueue("R");
	},
	"ArrowDown": () => {
		addActionToQueue("D");
	},
	"Space": e => {
		addActionToQueue("I");
	},
	"^Space": e => {
		addActionToQueue("T");
	},
	"Backspace": e => {
		addActionToQueue("B");
	},
	"^Backspace": e => {
		if (!selectedQueue.every(e => zones[displayZone].queues[e].length == 0)) {
			clearQueue(null, !settings.warnings);
			return;
		}
	},
	"KeyW": () => {
		if (settings.useWASD){
			addActionToQueue("U");
		} else {
			toggleAutoRestart();
		}
	},
	"KeyA": () => {
		if (settings.useWASD){
			addActionToQueue("L");
		}
	},
	"KeyS": () => {
		if (settings.useWASD){
			addActionToQueue("D");
		}
	},
	"KeyD": () => {
		if (settings.useWASD){
			addActionToQueue("R");
		}
	},
	"KeyR": () => {
		if (getStat("Mana").base == 5) {
			hideMessages();
		}
		resetLoop();
	},
	"KeyP": () => {
		toggleRunning();
	},
	"KeyB": () => {
		toggleBankedTime();
	},
	"KeyN": () => {
		if (!document.querySelector("#stuff .spell")) return;
		switchRuneList();
	},
	"KeyG": () => {
		toggleGrindMana();
	},
	"KeyZ": () => {
		toggleFollowZone();
	},
	"KeyQ": () => {
		toggleLoadPrereqs();
	},
	"Tab": e => {
		selectClone((selectedQueue[selectedQueue.length - 1] + 1) % clones.length);
		e.stopPropagation();
	},
	">Tab": e => {
		selectClone((clones.length + selectedQueue[selectedQueue.length - 1] - 1) % clones.length);
		e.stopPropagation();
	},
	"^KeyA": () => {
		clones[0].select();
		clones.slice(1).map(e => e.select(true));
	},
	"KeyC": () => {
		if (settings.useWASD){
			toggleAutoRestart();
		}
	},
	"End": () => {
		cursor[1] = null;
		showCursor();
	},
	"Digit1": () => {
		addRuneAction(0, 'rune');
	},
	"Digit2": () => {
		addRuneAction(1, 'rune');
	},
	"Digit3": () => {
		addRuneAction(2, 'rune');
	},
	"Digit4": () => {
		addRuneAction(3, 'rune');
	},
	"Digit5": () => {
		addRuneAction(4, 'rune');
	},
	"Numpad1": () => {
		addRuneAction(0, 'rune');
	},
	"Numpad2": () => {
		addRuneAction(1, 'rune');
	},
	"Numpad3": () => {
		addRuneAction(2, 'rune');
	},
	"Numpad4": () => {
		addRuneAction(3, 'rune');
	},
	"Numpad5": () => {
		addRuneAction(4, 'rune');
	},
	">Digit1": () => {
		addRuneAction(0, 'spell');
	},
	">Digit2": () => {
		addRuneAction(1, 'spell');
	},
	">Digit3": () => {
		addRuneAction(2, 'spell');
	},
	">Numpad1": () => {
		addRuneAction(0, 'spell');
	},
	">Numpad2": () => {
		addRuneAction(1, 'spell');
	},
	">Numpad3": () => {
		addRuneAction(2, 'spell');
	},
	"Equal": () => {
		addActionToQueue("=");
	},
	">Equal": () => {
		addActionToQueue("+");
	},
	"NumpadAdd": () => {
		addActionToQueue("+");
	},
	"Escape": () => {
		hideMessages();
	},
	"Enter": () => {
		hideMessages();
	},
	"KeyF": () => {
		if (visibleX === undefined || visibleY === undefined) return;
		addActionToQueue(`P${visibleX}:${visibleY};`);
		document.activeElement.blur();
	},
};

setTimeout(() => {
	let templateSelect = document.querySelector("#saved-queue-template .icon-select");
	for (let i = 0; i < possibleActionIcons.length; i++){
		let el = document.createElement("option");
		el.value = possibleActionIcons[i];
		el.innerHTML = possibleActionIcons[i];
		templateSelect.append(el);
	}
	document.body.onkeydown = e => {
		if (!document.querySelector("input:focus")) {
			let key = `${e.ctrlKey || e.metaKey ? '^' : ''}${e.shiftKey ? '>' : ''}${e.code}`;
			if (keyFunctions[key]){
				e.preventDefault();
				keyFunctions[key](e);
			}
		}
	};
	load();
}, 10);


function applyCustomStyling() {
	if (settings.debug_verticalBlocksJustify) {
		document.querySelector(".vertical-blocks").style.justifyContent = settings.debug_verticalBlocksJustify;
	}
}