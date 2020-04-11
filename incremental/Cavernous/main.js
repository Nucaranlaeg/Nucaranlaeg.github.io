let possibleActionIcons = ["★", "✣", "✦", "♣", "♠", "⚑", "×", "⬈", "⬉", "⬊", "⬋"];

/******************************************** Functions ********************************************/

function getNextAction(clone = currentClone) {
	let index = queues[clone].findIndex(a => a[1]);
	if (index == -1 || isNaN(+queues[clone][index][0])) return [queues[clone][index], index];
	let action = queues[clone][index];
	if (!action[2]){
		action[2] = savedQueues[action[0]];
	}
	let nextAction = action[2].find(a => a[`${clone}_${index}`] === undefined);
	if (!nextAction) return [undefined, -1];
	return [[nextAction[0], nextAction[`${clone}_${index}`] === undefined], index];
}

function completeNextAction(clone = currentClone) {
	let index = queues[clone].findIndex(a => a[1]);
	let action = queues[clone][index];
	clones[clone].currentCompletions = null;
	if (!action) return;
	if (isNaN(+action[0])){
		action[1] = false;
		return;
	}
	let nextAction = action[2].find(a => a[`${clone}_${index}`] === undefined);
	nextAction[`${clone}_${index}`] = false;
	if (action[2].every(a => a[`${clone}_${index}`] === false)) action[1] = false;
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

function redrawOptions() {
	document.querySelector("#time-banked").innerHTML = writeNumber(timeBanked / 1000, 1);
}

window.ondrop = e => e.preventDefault();

/******************************************** Prestiges ********************************************/

function resetLoop() {
	let mana = getStat("Mana");
	getMessage("Time Travel").display(mana.base == 5);
	if (mana.base >= 6) getMessage("Strip Mining").display();
	stats.forEach(s => s.reset());
	if (settings.grindMana && routes) {
		Route.loadBestRoute();
	}
	queues.forEach((q, i) => {
		q.forEach(a => {
			a[1] = true;
			a[2] = undefined;
		});
		resetQueueHighlight(i);
	});
	stuff.forEach(s => {
		s.count = 0;
		s.update();
	});
	clones.forEach(c => c.reset());
	mapLocations.forEach(ml => {
		ml.forEach(l => l.reset());
	})
	queueTime = 0;
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
	});
	map = originalMap.slice();
	drawMap();
	save();
	showFinalLocation();
}

/********************************************* Saving *********************************************/

function save(){
	let playerStats = stats.map(s => {
		return {
			"name": s.name,
			"base": s.learnable ? s.base : s.getNextLoopValue(),
		};
	});
	let locations = [];
	for (let y = 0; y < mapLocations.length; y++){
		for (let x = 0; x < mapLocations[y].length; x++){
			if (mapLocations[y][x]){
				let loc = mapLocations[y][x];
				locations.push([x - xOffset, y - yOffset, loc.type.reset(loc.completions, loc.priorCompletions)]);
			}
		}
	}
	let cloneData = {
		"count": clones.length,
		"queues": queues.map(queue => {
			return queue.map(q => {
				return q[0];
			});
		}),
	}
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
	//let savedRoutes = routes.map(r => [r.x, r.y, r.totalTimeAvailable, r.route])
	saveString = JSON.stringify({
		playerStats,
		locations,
		cloneData,
		stored,
		time,
		messageData,
		settings,
		routes,
	});
	localStorage["saveGame"] = btoa(saveString);
}

function load(){
	if (!localStorage["saveGame"]) return setup();
	let saveGame = JSON.parse(atob(localStorage["saveGame"]));
	stats.forEach(s => s.current = 0);
	for (let i = 0; i < saveGame.playerStats.length; i++){
		getStat(saveGame.playerStats[i].name).base = saveGame.playerStats[i].base;
	}
	mapLocations = [];
	while (mapLocations.length < map.length){
		mapLocations.push([]);
	}
	for (let i = 0; i < saveGame.locations.length; i++){
		getMapLocation(saveGame.locations[i][0], saveGame.locations[i][1], true).priorCompletions = saveGame.locations[i][2];
	}
	clones = [];
	while (clones.length < saveGame.cloneData.count){
		clones.push(new Clone(clones.length));
	}
	while (settings.useAlternateArrows != saveGame.settings.useAlternateArrows && saveGame.settings.useAlternateArrows !== undefined) toggleUseAlternateArrows();
	queues = [];
	for (let i = 0; i < saveGame.cloneData.queues.length; i++){
		queues.push(saveGame.cloneData.queues[i].map(q => [q, true]));
	}
	savedQueues = [];
	for (let i = 0; i < saveGame.stored.length; i++){
		savedQueues.push(saveGame.stored[i].queue);
		savedQueues[i].name = saveGame.stored[i].name;
		savedQueues[i].icon = possibleActionIcons[saveGame.stored[i].icon];
		savedQueues[i].colour = saveGame.stored[i].colour;
	}
	ensureLegalQueues();
	drawSavedQueues();
	lastAction = saveGame.time.saveTime;
	timeBanked = saveGame.time.timeBanked;
	for (let i = 0; i < saveGame.messageData.length; i++){
		let message = getMessage(saveGame.messageData[i][0]);
		if (message){
			message.displayed = saveGame.messageData[i][1];
		}
	}
	if (saveGame.routes){
		if (Array.isArray(saveGame.routes[0])) {
			routes = saveGame.routes.map(r => Route.migrateFromArray(r))
		} else {
			routes = Route.fromJSON(saveGame.routes);	
		}
	}
	while (settings.usingBankedTime != saveGame.settings.usingBankedTime) toggleBankedTime();
	while (settings.running != saveGame.settings.running) toggleRunning();
	toggleAutoRestart();
	while (settings.autoRestart != saveGame.settings.autoRestart) toggleAutoRestart();
	Object.assign(settings, saveGame.settings, settings);

	selectClone(0);
	redrawQueues();

	// Fix attack and defense
	getStat("Attack").base = 0;
	getStat("Defense").base = 0;
	stats.map(s => s.update());

	drawMap();
	resetLoop();
}

function ensureLegalQueues(){
	for (let i = 0; i < queues.length; i++){
		if (queues[i].some(q => !isNaN(+q[0]) && q[0] >= savedQueues.length)){
			queues[i] = [];
		}
	}
	for (let i = 0; i < savedQueues.length; i++){
		if (savedQueues[i].some(q => !isNaN(+q[0]) && (q[0] >= savedQueues.length || q[0] === null))){
			savedQueues[i].queue = [];
		}
	}
}

function deleteSave(){
	if (localStorage["saveGame"]) localStorage["saveGameBackup"] = localStorage["saveGame"];
	localStorage.removeItem("saveGame");
	window.location.reload();
}

function exportGame(){
	navigator.clipboard.writeText(localStorage["saveGame"]);
}

function importGame(){
	let saveString = prompt("Input your save");
	save();
	save = () => {};
	let temp = localStorage["saveGame"];
	localStorage["saveGame"] = saveString;
	try {
		load();
	} catch {
		localStorage["saveGame"] = temp;
		load();
	}
	window.location.reload();
}

function queueToString(queue){
	return queue.map(q => {
		return isNaN(+q[0]) ? q[0] : queueToString(savedQueues[q[0]]);
	}).join("");
}

function stringToQueue(string){
	let queue = [];
	for (let i = 0; i < string.length; i++){
		if (string[i] == "N"){
			queue.push([string.slice(i, i+2), false]);
			i++;
		} else {
			queue.push([string.slice(i, i+1), false]);
		}
	}
	return queue;
}

function exportQueues(){
	let exportString = queues.map(queue => queueToString(queue));
	navigator.clipboard.writeText(JSON.stringify(exportString));
}

function importQueues(){
	let queueString = prompt("Input your queues");
	let tempQueues = queues.slice();
	try {
		let newQueues = JSON.parse(queueString);
		if (newQueues.length > queues.length){
			alert("Could not import queues - too many queues.")
			return;
		}
		newQueues = newQueues.map(q => stringToQueue(q));
		for (let i = 0; i < queues.length; i++){
			queues[i] = newQueues[i] || [];
		}
		redrawQueues();
	} catch {
		alert("Could not import queues.");
		queues = tempQueues;
	}
}

/******************************************** Settings ********************************************/

let settings = {
	usingBankedTime: true,
	running: true,
	autoRestart: 0,
	useAlternateArrows: false,
	useWASD: false,
	useDifferentBridges: true,
	grindMana: false,
}

function toggleBankedTime() {
	settings.usingBankedTime = !settings.usingBankedTime;
	document.querySelector("#time-banked-toggle").innerHTML = settings.usingBankedTime ? "Using" : "Banking";
}

function toggleRunning() {
	settings.running = !settings.running;
	document.querySelector("#running-toggle").innerHTML = settings.running ? "Running" : "Paused";
	document.querySelector("#running-toggle").closest(".option").classList.toggle("option-highlighted", !settings.running); 
}

function toggleAutoRestart() {
	settings.autoRestart = (settings.autoRestart + 1) % 4;
	document.querySelector("#auto-restart-toggle").innerHTML = ["Wait when any complete", "Restart when complete", "Restart always", "Wait when all complete"][settings.autoRestart];
	document.querySelector("#auto-restart-toggle").closest(".option").classList.toggle("option-highlighted", settings.autoRestart == 0); 
}

function toggleUseAlternateArrows() {
	settings.useAlternateArrows = !settings.useAlternateArrows;
	document.querySelector("#use-alternate-arrows-toggle").innerHTML = settings.useAlternateArrows ? "Use default arrows" : "Use alternate arrows";
}

function toggleUseWASD() {
	settings.useWASD = !settings.useWASD;
	document.querySelector("#use-wasd-toggle").innerHTML = settings.useWASD ? "Use arrow keys" : "Use WASD";
	document.querySelector("#auto-restart-key").innerHTML = settings.useWASD ? "C" : "W";
}

function toggleGrindMana() {
	settings.grindMana = !settings.grindMana;
	document.querySelector("#grind-mana-toggle").innerHTML = settings.grindMana ? "Grinding mana rocks" : "Not grinding mana rocks";
	document.querySelector("#grind-mana-toggle").closest(".option").classList.toggle("option-highlighted", settings.grindMana); 
}

/******************************************** Game loop ********************************************/

let lastAction = Date.now();
let timeBanked = 0;
let queueTime = 0;
let currentClone = 0;
let fps = 60;

setInterval(function mainLoop() {
	let time = Date.now() - lastAction;
	let usedBank = 0;
	let mana = getStat("Mana");
	lastAction = Date.now();
	if (mana.current == 0){
		document.querySelector("#queues").classList.add("out-of-mana")
		getMessage("Out of Mana").display();
		if (settings.autoRestart == 2){
			resetLoop();
		}
	} else {
		document.querySelector("#queues").classList.remove("out-of-mana")
	}
	if (!settings.running || mana.current == 0 || (settings.autoRestart == 0 && queues.some((q, i) => getNextAction(i)[0] === undefined)) || (settings.autoRestart == 3 && queues.every((q, i) => getNextAction(i)[0] === undefined))){
		timeBanked += time / 2;
		redrawOptions();
		return;
	}
	let timeAvailable = time;
	if (settings.usingBankedTime && timeBanked > 0){
		let speedMultiplier = settings.debug_speedMultiplier || 10;
		timeAvailable = Math.min(time + timeBanked, time * speedMultiplier);
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
	
	// for (let i = 0; i < clones.length; i++){
	// 	if (clones[i].damage == Infinity) continue;
	// 	currentClone = i;
	// 	timeLeft = Math.min(performAction(timeAvailable), timeLeft);
	// }
	timeLeft = Clone.performActions(timeAvailable);

	
	let timeUsed = timeAvailable - timeLeft;
	if (timeUsed > time) {
		timeBanked -= timeUsed - time;
	} else {
		timeBanked += (time - timeUsed) / 2;
	}
	queueTime += timeUsed;
	mana.spendMana(timeUsed / 1000);
	if (timeLeft && (settings.autoRestart == 1 || settings.autoRestart == 2)){
		resetLoop();
	}
	let timeDiv = document.querySelector("#time-spent");
	if (timeDiv) timeDiv.innerHTML = writeNumber(queueTime / 1000, 1);
	redrawOptions();

	stats.map(e=>e.update())
	drawMap();
}, Math.floor(1000 / fps));

function performAction(time, lastTime) {
	throw "Outdated";
	return Clone.performActions(time);
	let nextAction, actionIndex;
	while (time > 0 && ([nextAction, actionIndex] = getNextAction())[0] !== undefined){
		let clone = clones[currentClone];
		let xOffset = {
			"L": -1,
			"R": 1
		}[nextAction[0]] || 0;
		let yOffset = {
			"U": -1,
			"D": 1
		}[nextAction[0]] || 0;
		if (nextAction[0][0] == "N"){
			if (runes[nextAction[0][1]].create(clones[currentClone].x + xOffset, clone.y + yOffset)){
				selectQueueAction(currentClone, actionIndex, 100);
				completeNextAction();
				continue;
			} else {
				return 0;
			}
		}
		if (nextAction[0] == "<") {
			completeNextAction();
			continue;
		}
		if (nextAction[0] == "=") {
			clone.waiting = true;
			if (clones.every((c, i) => {
					return (c.waiting === true || (c.waiting <= queueTime && c.waiting >= queueTime - 100)) || !queues[i].find(q => q[0] == "=" && q[1])
				})){
				clone.waiting = queueTime;
				selectQueueAction(currentClone, actionIndex, 100);
				completeNextAction();
				continue;
			}
			return 0;
		}
		let location = getMapLocation(clone.x + xOffset, clone.y + yOffset);
		if (clone.currentCompletions === null) clone.currentCompletions = location.completions;
		if ((!xOffset && !yOffset && location.canWorkTogether && clone.currentProgress && (clone.currentProgress < location.remainingPresent || location.remainingPresent == 0))
			|| (clone.currentCompletions !== null && clone.currentCompletions < location.completions)){
			completeNextAction();
			clone.currentProgress = 0;
			selectQueueAction(currentClone, actionIndex, 100);
			continue;
		}
		if ((location.remainingPresent <= 0 && !xOffset && !yOffset) || (location.remainingEnter <= 0 && (xOffset || yOffset))){
			let startStatus = location.start();
			if (startStatus == 0){
				completeNextAction();
				clone.currentProgress = 0;
				// drawMap(); // moved to main loop
				selectQueueAction(currentClone, actionIndex, 100);
				continue;
			} else if (startStatus < 0){
				return 0;
			}
		}
		[time, percentRemaining] = location.tick(time);
		selectQueueAction(currentClone, actionIndex, 100 - (percentRemaining * 100));
		clone.currentProgress = location.remainingPresent;
		if (!percentRemaining){
			completeNextAction();
			clone.currentProgress = 0;
			// drawMap(); // moved to main loop
		}
	}
	if (time > 0){
		let repeat = queues[currentClone].findIndex(q => q[0] == "<");
		if (repeat > -1){
			for (let i = repeat + 1; i < queues[currentClone].length; i++){
				queues[currentClone][i][1] = true;
				if (queues[currentClone][i][2]){
					for (let inner of queues[currentClone][i][2]) {
						delete inner[`${currentClone}_${i}`];
					}
				}
				selectQueueAction(currentClone, i, 0);
			}
			if (repeat < queues[currentClone].length - 1 && (!lastTime || time < lastTime)) return performAction(time, time);
		}
	}
	return time;
}

function setup(){
	clones.push(new Clone(clones.length));
	selectClone(0);
	getMapLocation(0,0);
	drawMap();
	getMessage("Welcome to Cavernous!").display();
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
	"Backspace": e => {
		addActionToQueue("B");
		if (e.ctrlKey){
			clearQueue();
		}
	},
	"^Backspace": e => {
		addActionToQueue("B");
		if (e.ctrlKey) {
			clearQueue();
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
		resetLoop();
	},
	"KeyP": () => {
		toggleRunning();
	},
	"KeyB": () => {
		toggleBankedTime();
	},
	"KeyG": () => {
		toggleGrindMana();
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
		addActionToQueue("N0");
	},
	"Digit2": () => {
		addActionToQueue("N1");
	},
	"Digit3": () => {
		addActionToQueue("N2");
	},
	"Equal" : () => {
		addActionToQueue("=");
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
		hideMessages();
		if (!document.querySelector("input:focus")) {
			let key = `${e.ctrlKey ? '^' : ''}${e.shiftKey ? '>' : ''}${e.code}`;
			if (keyFunctions[key]){
				e.preventDefault();
				keyFunctions[key](e);
			}
		}
	};
	load();
}, 10);
