const possibleActionIcons = ["★", "✣", "✦", "♣", "♠", "⚑", "×", "⬈", "⬉", "⬊", "⬋"];

const version = (document.querySelector("#version") as HTMLElement).innerText
	.split(".")
	.map((e, i) => parseInt(e, 36) / 100 ** i)
	.reduce((v, e) => v + e);
let previousVersion: number;

/** ****************************************** Functions ********************************************/

let skipActionComplete = false;

function getLocationTypeBySymbol(symbol: LocationType["symbol"]) {
	return locationTypes.find(a => a.symbol == symbol)?.name;
}

function writeNumber(value: number, decimals = 0) {
	if (value < 10 ** -(decimals + 1)) value = 0;
	if (value > 100) decimals = Math.min(decimals, 1);
	return value.toFixed(decimals);
}

function writeTime(value: number) {
	if (value == Infinity) return "Infinity";
	let hours: string | number = Math.floor(value / 3600);
	hours = `${hours ? `${hours}:` : ""}`;
	let minutes: string | number = Math.floor((value % 3600) / 60);
	minutes = minutes || hours ? (minutes > 9 ? `${minutes}:` : `0${minutes}:`) : "";
	let seconds: string | number = Math.floor((value % 60) * 10) / 10;
	if (value > 100 * 3600) seconds = Math.floor(seconds);
	seconds = seconds < 10 && minutes ? `0${seconds.toFixed(value > 100 * 3600 ? 0 : 1)}` : seconds.toFixed(value > 100 * 3600 ? 0 : 1);
	return `${hours}${minutes}${seconds}`;
}

let timeBankNode: HTMLElement;

function redrawTimeNode() {
	timeBankNode = timeBankNode || document.querySelector("#time-banked");
	timeBankNode.innerText = writeTime(timeBanked / 1000);
}

window.ondrop = e => e.preventDefault();

/** ****************************************** Prestiges ********************************************/

let resetting = false;

function resetLoop(noLoad = false, saveGame = true) {
	if (resetting) return;
	shouldReset = false;
	resetting = true;
	const mana = getStat("Mana");
	if (getMessage("Time Travel").display(zones[0].manaGain == 0 && realms[currentRealm].name == "Core Realm")) setSetting(toggleAutoRestart, 3);
	if (mana.base == 5.5) getMessage("The Looping of Looping Loops").display() && setSetting(toggleAutoRestart, 1);
	if (mana.base == 6) getMessage("Strip Mining").display();
	if (mana.base == 7.4) getMessage("Buy More Time").display();
	if (routes.length == 3) getMessage("All the known ways").display() && setSetting(toggleGrindMana, true);
	if (queueTime > 50) getMessage("Looper's Log: Supplemental").display();
	storeLoopLog();
	stats.forEach((s, i) => {
		GrindRoute.updateBestRoute(s.name, s.current - loopStatStart[i]);
		s.reset();
		s.update();
	});
	if (settings.grindMana && routes.length && !noLoad) {
		Route.loadBestRoute();
	}
	if (settings.grindStats && grindRoutes.length) {
		GrindRoute.loadBestRoute();
	}
	stuff.forEach(s => {
		s.count = 0;
		s.update();
	});
	clones.forEach(c => c.reset());
	queueTime = 0;
	loopCompletions = 0;
	creatures.forEach(c => {
		c.attack = c.creature.attack;
		c.defense = c.creature.defense;
		c.health = c.creature.health;
		c.drawHealth();
	});
	zones.forEach(z => {
		z.resetZone();
		(z.queues || []).forEach(q => q.reset());
	});
	updateRunes();
	moveToZone(0, false);
	getStat("Mana").dirty = true;
	getStat("Mana").update();
	drawMap();
	if (saveGame) save();
	showFinalLocation();
	if (isNaN(timeBanked)) {
		timeBanked = 0;
	}
	resetting = false;
	currentRoutes = [];
}

/********************************************* Loop Log *********************************************/

let loopActions: { [key in string]: number[] } = {};
let loopStatStart: number[] = [];
let previousLoopLogs: {
	actions: { [key in string]: number[] };
	stats: {current: number, base: number}[];
	kept: boolean;
}[] = [];
let loopGoldVaporized: [number, number] = [0, 0];
let loopLogVisible = false;
const loopLogBox = document.querySelector("#loop-log-box") as HTMLElement;
if (loopLogBox === null) throw new Error("No loop log box found");
const logEntryTemplate = document.querySelector("#log-entry-template") as HTMLElement;
logEntryTemplate.removeAttribute("id");
const statLogEntryTemplate = document.querySelector("#stat-log-entry-template") as HTMLElement;
statLogEntryTemplate.removeAttribute("id");
const previousLogTemplate = document.querySelector("#previous-log-template") as HTMLElement;
previousLogTemplate.removeAttribute("id");
const MAX_EPHEMERAL_LOGS = 10;
const loopGoldCountNode = document.querySelector("#loop-gold-count") as HTMLElement;
const loopGoldValueNode = document.querySelector("#loop-gold-value") as HTMLElement;
let displayedOldLog = false;

function storeLoopLog(){
	if (!Object.keys(loopActions).length){
		loopStatStart = stats.map(s => s.base);
		return;
	}
	const newLog = {
		actions: {...loopActions},
		stats: loopStatStart.map((s, i) => {
			return {current: stats[i].current - loopStatStart[i], base: stats[i].base - loopStatStart[i]};
		}),
		kept: false,
	};
	loopActions = {};
	loopStatStart = stats.map(s => s.base);
	previousLoopLogs.push(newLog);
	const ephemeralLogCount = previousLoopLogs.filter(l => !l.kept).length;
	if (ephemeralLogCount > MAX_EPHEMERAL_LOGS){
		let filtered = false;
		previousLoopLogs = previousLoopLogs.filter(l => filtered || l.kept || ((filtered = true) && false));
	}
	loopGoldVaporized = [0, 0];
}

function displayLoopLog(logActions = loopActions, logStats: {current: number, base: number}[] | null = null) {
	loopLogBox.hidden = false;
	loopLogVisible = true;
	const loopActionNode = loopLogBox.querySelector("#loop-actions") as HTMLElement;
	const loopStatNode = loopLogBox.querySelector("#loop-stats") as HTMLElement;
	const loopPrevNode = loopLogBox.querySelector("#loop-prev-list") as HTMLElement;
	while (loopActionNode.lastChild) {
		loopActionNode.removeChild(loopActionNode.lastChild);
	}
	while (loopStatNode.lastChild) {
		loopStatNode.removeChild(loopStatNode.lastChild);
	}
	while (loopPrevNode.lastChild) {
		loopPrevNode.removeChild(loopPrevNode.lastChild);
	}
	let actions = Object.entries(logActions);
	actions = actions.sort((a, b) => b[1].reduce((acc, cur) => acc + cur, 0) - a[1].reduce((acc, cur) => acc + cur, 0));
	const totalActionNode = logEntryTemplate.cloneNode(true) as HTMLElement;
	totalActionNode.querySelector(".name")!.innerHTML = "Total clone-seconds";
	totalActionNode.querySelector(".value")!.innerHTML = writeNumber(actions.reduce((a, c) => a + c[1].reduce((acc, cur) => acc + cur, 0), 0) / 1000, 1);
	totalActionNode.style.fontWeight = "bold";
	loopActionNode.append(totalActionNode);
	const totalStatNode = statLogEntryTemplate.cloneNode(true) as HTMLElement;
	totalStatNode.querySelector(".name")!.innerHTML = "Total stats gained";
	totalStatNode.style.fontWeight = "bold";
	loopStatNode.append(totalStatNode);
	for (let i = 0; i < actions.length; i++) {
		const node = logEntryTemplate.cloneNode(true) as HTMLElement;
		node.classList.add(actions[i][0].replace(/ /g, "-"));
		node.querySelector(".name")!.innerHTML = actions[i][0];
		node.querySelector(".value")!.innerHTML = writeNumber(actions[i][1].reduce((acc, cur) => acc + cur, 0) / 1000, 1);
		node.querySelector(".description")!.innerHTML = `Relevant stats:<br>${getAction(<anyActionName>actions[i][0])?.stats.map(s => `${s[0].name}: ${s[1]}`).join("<br>") || ""}`;
		loopActionNode.append(node);
		node.style.color = setRGBContrast(window.getComputedStyle(node).backgroundColor);
	}
	let totalStats = 0;
	for (let i = 0; i < loopStatStart.length; i++) {
		if (!stats[i].learnable) continue;
		if (stats[i].current == loopStatStart[i]) continue;
		const node = statLogEntryTemplate.cloneNode(true) as HTMLElement;
		node.querySelector(".name")!.innerHTML = stats[i].name;
		if (logStats === null){
			node.querySelector(".current-value")!.innerHTML = writeNumber(stats[i].current - loopStatStart[i], 3);
			node.querySelector(".base-value")!.innerHTML = writeNumber(stats[i].base - loopStatStart[i], 3);
		} else {
			node.querySelector(".current-value")!.innerHTML = writeNumber(logStats[i].current, 3);
			node.querySelector(".base-value")!.innerHTML = writeNumber(logStats[i].base, 3);
		}
		totalStats += stats[i].base - loopStatStart[i];
		loopStatNode.append(node);
	}
	totalStatNode.querySelector(".base-value")!.innerHTML = writeNumber(totalStats, 3);
	if (+getComputedStyle(loopActionNode).height.replace("px", "") > +getComputedStyle(document.body).height.replace("px", "") * 0.68){
		loopActionNode.style.overflowY = "auto";
	} else {
		loopActionNode.style.overflowY = "unset";
	}
	loopGoldCountNode.innerHTML = loopGoldVaporized[0].toString();
	loopGoldValueNode.innerHTML = writeNumber(loopGoldVaporized[1], 3);
	const node = previousLogTemplate.cloneNode(true) as HTMLElement;
	node.querySelector(".name")!.innerHTML = "Current";
	node.querySelector(".value")!.innerHTML = writeNumber(Object.values(loopActions).reduce((a, c) => a + c.reduce((acc, cur) => acc + cur, 0), 0) / 1000, 1) + " cs";
	node.onclick = e => {
		displayedOldLog = false;
		displayLoopLog();
		e.stopPropagation();
	}
	loopPrevNode.append(node);
	for (let i = previousLoopLogs.length - 1; i >= 0; i--){
		let log = previousLoopLogs[i];
		const node = previousLogTemplate.cloneNode(true) as HTMLElement;
		node.querySelector(".name")!.innerHTML = "Previous log";
		node.querySelector(".value")!.innerHTML = writeNumber(Object.values(log.actions).reduce((a, c) => a + c.reduce((acc, cur) => acc + cur, 0), 0) / 1000, 1) + " cs";
		node.onclick = e => {
			displayedOldLog = true;
			displayLoopLog(log.actions, log.stats);
			e.stopPropagation();
		}
		loopPrevNode.append(node);
	}
}

function hideLoopLog() {
	loopLogBox.hidden = true;
	loopLogVisible = false;
	displayedOldLog = false;
}

/** ******************************************* Saving *********************************************/

const URLParams = new URL(document.location.href).searchParams;
let saveName = URLParams.get("save") || "";
saveName = `saveGameII${saveName && "_"}${saveName}`;
const savingDisabled = URLParams.get("saving") == "disabled";

interface saveGame {
	version: number;
	playerStats: {
		name: anyStatName;
		base: number;
	}[];
	zoneData: {
		name: string;
		locations: any[];
		queues: string[][];
		routes: ZoneRoute[];
		goal: boolean;
		challenge?: boolean; //prior to 2.0.6
	}[];
	currentRealm: number;
	cloneData: {
		count: number;
	};
	time: {
		saveTime: number;
		timeBanked: number;
	};
	messageData: [typeof messages[number]["name"], boolean][];
	settings: settings;
	routes: Exclude<Route, "usedRoutes">[];
	savedRoutes?: string;
	grindRoutes: GrindRoute[];
	runeData: {
		name: anyRuneName;
		upgradeCount: number;
	}[];
	machines: number[];
	realmData: {
		completed: boolean;
	}[];
}

let save = async function save() {
	if (savingDisabled) return;
	const playerStats = stats.map(s => {
		return {
			name: s.name,
			base: s.base,
		};
	});
	const zoneData = zones.map(zone => {
		const zoneLocations = [];
		for (let y = 0; y < zone.mapLocations.length; y++) {
			for (let x = 0; x < zone.mapLocations[y].length; x++) {
				if (zone.mapLocations[y][x]) {
					const loc = zone.mapLocations[y][x];
					zoneLocations.push([x - zone.xOffset, y - zone.yOffset, loc.priorCompletionData]);
				}
			}
		}
		return {
			name: zone.name,
			locations: zoneLocations,
			queues: zone.queues ? zone.queues.map(queue => queue.map(q => q.actionID)) : [[]],
			routes: zone.routes,
			goal: zone.goalComplete,
		};
	});
	const cloneData = {
		count: clones.length,
	};
	const time = {
		saveTime: Date.now(),
		timeBanked,
	};
	const messageData = messages.map(m => [m.name, m.displayed] as [typeof m["name"], boolean]);
	const savedRoutes = JSON.parse(
		JSON.stringify(routes, (key, value) => {
			if (key == "usedRoutes") return undefined;
			return value;
		})
	);
	const runeData = runes.map(r => {
		return {
			name: r.name,
			upgradeCount: r.upgradeCount
		};
	});
	const machines = realms.map(r => r.machineCompletions);
	const realmData = realms.map(r => {
		return {
			completed: r.completed,
		};
	});

	let saveGame: saveGame = {
		version: version,
		playerStats: playerStats,
		zoneData: zoneData,
		currentRealm: currentRealm,
		cloneData: cloneData,
		time: time,
		messageData: messageData,
		settings: settings,
		routes: savedRoutes,
		grindRoutes: grindRoutes,
		runeData: runeData,
		machines: machines,
		realmData: realmData,
	};
	let saveString = JSON.stringify(saveGame);
	// Typescript can't find LZString, and I don't care.
	// @ts-ignore
	localStorage[saveName] = LZString.compressToBase64(saveString);
};

function load() {
	if (!localStorage[saveName]) return setup();
	if (savingDisabled) return setup();
	let saveGame: saveGame;
	try {
		// Typescript can't find LZString, and I don't care.
		// @ts-ignore
		saveGame = JSON.parse(LZString.decompressFromBase64(localStorage[saveName])!);
	} catch {
		// Prior to 2.2.6
		saveGame = JSON.parse(atob(localStorage[saveName]));
	}
	if (!saveGame.routes) saveGame.routes = JSON.parse(saveGame.savedRoutes as string);
	previousVersion = saveGame.version || 2;
	// if (version < previousVersion) {
	// 	alert(`Error: Version number reduced!\n${previousVersion} -> ${version}`);
	// }

	stats.forEach(s => (s.current = 0));
	for (let i = 0; i < saveGame.playerStats.length; i++) {
		const stat = getStat(saveGame.playerStats[i].name);
		if (stat) stat.base = saveGame.playerStats[i].base;
	}
	for (let i = 0; i < saveGame.messageData.length; i++) {
		const message = getMessage(saveGame.messageData[i][0]);
		if (message) {
			message.displayed = saveGame.messageData[i][1];
		}
	}
	clones = [];
	while (clones.length < saveGame.cloneData.count) {
		Clone.addNewClone(true);
	}
	for (let i = 0; i < saveGame.zoneData.length; i++) {
		const zone = zones.find(z => z.name == saveGame.zoneData[i].name);
		if (zone === undefined) throw new Error(`No zone "${saveGame.zoneData[i].name}" exists`);

		for (let j = 0; j < saveGame.zoneData[i].locations.length; j++) {
			const mapLocation = zone.getMapLocation(saveGame.zoneData[i].locations[j][0], saveGame.zoneData[i].locations[j][1], true);
			if (mapLocation === null){
				console.warn(new Error("Tried loading non-existent map location"));
				continue;
			}
			mapLocation.priorCompletionData = saveGame.zoneData[i].locations[j][2];
			while (mapLocation.priorCompletionData.length < realms.length) mapLocation.priorCompletionData.push(0);
		}
		zone.queues = ActionQueue.fromJSON(saveGame.zoneData[i].queues);
		zone.routes = ZoneRoute.fromJSON(saveGame.zoneData[i].routes);
		// Challenge for < 2.0.6
		if (saveGame.zoneData[i].goal || saveGame.zoneData[i].challenge as boolean) zone.completeGoal();
	}
	for (let i = 0; i < realms.length; i++) {
		currentRealm = i;
		realms[i].machineCompletions = (saveGame.machines || [])[i] || 0;
		recalculateMana();
	}
	saveGame.realmData?.forEach((r, i) => {
		if (r.completed) realms[i].complete();
	});
	lastAction = saveGame.time.saveTime;
	timeBanked = +saveGame.time.timeBanked + Date.now() - lastAction;
	if (saveGame.routes) {
		routes = Route.fromJSON(saveGame.routes);
	}
	if (saveGame.grindRoutes) {
		grindRoutes = GrindRoute.fromJSON(saveGame.grindRoutes);
	}
	for (let i = 0; i < (saveGame.runeData || []).length; i++) {
		runes[i].upgradeCount = saveGame.runeData[i].upgradeCount || 0;
	}

	for (let i = 0; i < realms.length; i++) {
		getRealmComplete(realms[i]);
	}

	loadSettings(saveGame.settings);

	zones[0].queues[0].selected = true;
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

function deleteSave() {
	if (localStorage[saveName]) localStorage[saveName + "Backup"] = localStorage[saveName];
	localStorage.removeItem(saveName);
	window.location.reload();
}

function exportGame() {
	navigator.clipboard.writeText(localStorage[saveName]);
}

function importGame() {
	const saveString = prompt("Input your save");
	if (!saveString) return;
	save();
	// Disable saving until the next reload.
	save = async () => {};
	const temp = localStorage[saveName];
	localStorage[saveName] = saveString;
	try {
		const queueNode = document.querySelector("#queues") as HTMLElement;
		queueNode.innerHTML = "";
		load();
	} catch (e) {
		console.log(e)
		localStorage[saveName] = temp;
		load();
	}
	window.location.reload();
}

function displaySaveClick(event: MouseEvent){
	let el = (<HTMLElement>event.target).closest(".clickable");
	if (!el) return;
	el.classList.add("ripple");
	setTimeout(() => el!.classList.remove("ripple"), 1000);
}

/** ****************************************** Game loop ********************************************/

let lastAction = Date.now();
let timeBanked = 0;
let queueTime = 0;
let queuesNode: HTMLElement;
let queueTimeNode: HTMLElement;
let zoneTimeNode: HTMLElement;
let queueActionNode: HTMLElement;
let loopCompletions = 0;
let gameStatus = {paused: false};
const fps = 60;
let shouldReset = false;

setInterval(function mainLoop() {
	if (shouldReset) {
		resetLoop();
	}
	const mana = getStat("Mana");
	queuesNode = queuesNode || document.querySelector("#queues");
	if (isNaN(mana.current) && settings.running) toggleRunning();
	const time = Date.now() - lastAction;
	lastAction = Date.now();
	if (settings.running){
		if (mana.current == 0 || clones.every(c => c.damage === Infinity)){
			queuesNode.classList.add("out-of-mana");
			getMessage("Out of Mana").display();
			if (settings.autoRestart == AutoRestart.RestartAlways || (settings.autoRestart == AutoRestart.RestartDone && clones.every(c => c.repeated))){
				resetLoop();
			}
		} else {
			queuesNode.classList.remove("out-of-mana");
		}
		if (settings.autoRestart == AutoRestart.RestartAlways && zones[currentZone].queues.every(q => !q.getNextAction())){
			queuesNode.classList.remove("out-of-mana");
			resetLoop();
		}
	}
	if (!settings.running ||
			mana.current == 0 ||
			(settings.autoRestart == AutoRestart.WaitAny && zones[currentZone].queues.some(q => !q.getNextAction() && (!q.length || q[q.length - 1].actionID != "="))) ||
			(settings.autoRestart == AutoRestart.WaitAll && zones[currentZone].queues.every(q => !q.getNextAction()) && clones.some(c => c.damage < Infinity)) ||
			!messageBox.hidden) {
		timeBanked += time;
		gameStatus.paused = true;
		redrawTimeNode();
		return;
	}
	let timeAvailable = time;
	if (settings.usingBankedTime && timeBanked > 0) {
		const speedMultiplier = 3 + zones[0].cacheManaGain[0] ** 0.5;
		timeAvailable = Math.min(time + timeBanked, time * speedMultiplier);
	}
	timeAvailable = Math.min(timeAvailable, settings.maxTotalTick, mana.current * 1000);
	if (timeAvailable < 0) timeAvailable = 0;

	let timeLeft = runActions(timeAvailable);

	timeBanked += (time + timeLeft - timeAvailable);
	if (timeBanked < 0) timeBanked = 0;

	if (zones[currentZone].queues.some(q => q.selected)){
		clones[zones[currentZone].queues.findIndex(q => q.selected)].writeStats();
	}
	queueTimeNode = queueTimeNode || document.querySelector("#time-spent");
	queueTimeNode.innerText = writeNumber(queueTime / 1000, 1);
	zoneTimeNode = zoneTimeNode || document.querySelector("#time-spent-zone");
	zoneTimeNode.innerText = writeNumber((queueTime - (zones[currentZone].zoneStartTime || 0)) / 1000, 1);
	queueActionNode = queueActionNode || document.querySelector("#actions-spent");
	queueActionNode.innerText = `${writeNumber(loopCompletions, 0)} (x${writeNumber(1 + loopCompletions / 40, 3)})`;
	redrawTimeNode();

	stats.forEach(e => e.update());
	stuff.forEach(e => e.displayDescription());
	drawMap();
	if (loopLogVisible && !displayedOldLog) displayLoopLog();
}, Math.floor(1000 / fps));

function runActions(time: number): number {
	const mana = getStat("Mana");
	let loops = 0;
	while (time > 0.001){
		let actions = <QueueAction[]>zones[currentZone].queues.map(q => q.getNextAction());
		const nullActions = actions.map((a, i) => a === null ? i : -1).filter(a => a > -1);
		actions = actions.filter(a => a !== null);
		if (actions.length == 0){
			if (settings.autoRestart == AutoRestart.RestartAlways || settings.autoRestart == AutoRestart.RestartDone){
				resetLoop();
			}
			gameStatus.paused = true;
			return time;
		}
		if (actions.some(a => a.done == ActionStatus.NotStarted)){
			actions.forEach(a => a.start());
			continue;
		}
		const waitActions = actions.filter(a => a.done != ActionStatus.Started);
		actions = actions.filter(a => a.done == ActionStatus.Started);
		if (zones[currentZone].queues.every((q, i) => clones[i].isSyncing || clones[i].damage == Infinity || clones[i].notSyncing || !q.hasFutureSync())
		      && waitActions.some(a => a.action == "=")){
			waitActions.filter(a => a.action == "=").forEach(a => a.complete());
			clones.forEach(c => c.unSync());
			continue;
		}
		if (actions.length == 0){
			gameStatus.paused = true;
			return time;
		}
		const instances = actions.map(a => <ActionInstance>a.currentAction);
		if (actions.some(a => a.currentAction?.expectedLeft === 0 && a.actionID == "T")){
			// If it's started and has nothing left, it's tried to start an action with no duration - like starting a Wither activation when it's complete.
			actions.forEach(a => {
				if (a.currentAction?.expectedLeft === 0 && a.actionID == "T") a.done = 3;
			});
			continue;
		}
		let nextTickTime = Math.min(...instances.map(i => i.expectedLeft / instances.reduce((a, c) => a + +(c === i), 0)), time);
		if (nextTickTime < 0.01) nextTickTime = 0.01;
		actions.forEach(a => a.tick(nextTickTime));
		nullActions.forEach(a => clones[a].addToTimeline({name: clones[a].damage === Infinity ? "Dead" : "None"}, nextTickTime));
		waitActions.forEach(a => a.currentClone!.addToTimeline({name: "Wait"}, nextTickTime));
		clones.forEach(c => c.drown(nextTickTime));
		zones[currentZone].tick(nextTickTime);
		mana.spendMana(nextTickTime / 1000);
		time -= nextTickTime;
		queueTime += nextTickTime;
	}
	gameStatus.paused = false;
	return 0;
}

function setup() {
	Clone.addNewClone();
	zones[0].enterZone();
	zones[0].queues[0].selected = true;
	getMapLocation(0, 0);
	drawMap();
	getMessage("Welcome to Cavernous!").display();
	if (URLParams.has("timeless")) {
		timeBanked = Infinity;
	}
}

/** **************************************** Key Bindings ******************************************/

const keyFunctions:{[key:string]:(event:KeyboardEvent)=>void} = {
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
	"Space": () => {
		addActionToQueue("I");
	},
	"^Space": () => {
		addActionToQueue("T");
	},
	"Backspace": () => {
		addActionToQueue("B");
	},
	"^Backspace": () => {
		clearQueues();
	},
	"KeyW": () => {
		if (settings.useWASD) {
			addActionToQueue("U");
		} else {
			toggleAutoRestart();
		}
	},
	"KeyA": () => {
		if (settings.useWASD) {
			addActionToQueue("L");
		}
	},
	"KeyS": () => {
		if (settings.useWASD) {
			addActionToQueue("D");
		} else {
			toggleGrindStats();
		}
	},
	"KeyD": () => {
		if (settings.useWASD) {
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
	"KeyG": () => {
		toggleGrindMana();
	},
	"KeyZ": () => {
		toggleFollowZone();
	},
	"KeyQ": () => {
		toggleLoadPrereqs();
	},
	"Tab": (e:Event) => {
		const previous = zones[currentZone].queues.findIndex(q => q.selected);
		zones[currentZone].queues.forEach((q, i) => q.selected = i == (previous + 1) % clones.length);
		e.stopPropagation();
	},
	">Tab": (e:Event) => {
		const previous = zones[currentZone].queues.findIndex(q => q.selected);
		zones[currentZone].queues.forEach((q, i) => q.selected = previous == (i + 1) % clones.length);
		e.stopPropagation();
	},
	"^KeyA": () => {
		zones[currentZone].queues.forEach(q => [q.selected, q.cursor] = [true, null]);
	},
	"KeyC": () => {
		if (settings.useWASD) {
			toggleAutoRestart();
		}
	},
	"KeyT": () => {
		if (settings.useWASD) {
			toggleGrindStats();
		}
	},
	"End": () => {
		zones[displayZone].queues.forEach(q => q.cursor = null);
	},
	"Home": () => {
		zones[displayZone].queues.forEach(q => q.cursor = -1);
	},
	"^ArrowLeft": () => {
		zones[displayZone].queues.forEach(q => q.cursor === null || q.cursor--);
	},
	"^ArrowRight": () => {
		zones[displayZone].queues.forEach(q => q.cursor === null || q.cursor++);
	},
	"^KeyW": () => {
		if (!settings.useWASD) return;
		let queues = zones[displayZone].queues;
		document.querySelectorAll(`.selected-clone`).forEach(n => n.classList.remove("selected-clone"));
		for (let i = 1; i < clones.length; i++){
			if (!queues.some(q => q.index == i - 1) && queues.some(q => q.index == i ? q.index-- + Infinity : false)){
				[queues[i], queues[i-1]] = [queues[i-1], queues[i]];
			}
		}
		queues.forEach(q => q.selected = true);
		redrawQueues();
	},
	"^ArrowUp": () => {
		let queues = zones[displayZone].queues;
		document.querySelectorAll(`.selected-clone`).forEach(n => n.classList.remove("selected-clone"));
		for (let i = 1; i < clones.length; i++){
			if (!queues.some(q => q.index == i - 1) && queues.some(q => q.index == i ? q.index-- + Infinity : false)){
				[queues[i], queues[i-1]] = [queues[i-1], queues[i]];
			}
		}
		queues.forEach(q => q.selected = true);
		redrawQueues();
	},
	"^KeyS": () => {
		if (!settings.useWASD) return;
		let queues = zones[displayZone].queues;
		document.querySelectorAll(`.selected-clone`).forEach(n => n.classList.remove("selected-clone"));
		for (let i = 1; i < clones.length; i++){
			if (!queues.some(q => q.index == i - 1) && queues.some(q => q.index == i ? q.index-- + Infinity : false)){
				[queues[i], queues[i-1]] = [queues[i-1], queues[i]];
			}
		}
		queues.forEach(q => q.selected = true);
		redrawQueues();
	},
	"^ArrowDown": () => {
		let queues = zones[displayZone].queues;
		document.querySelectorAll(`.selected-clone`).forEach(n => n.classList.remove("selected-clone"));
		for (let i = clones.length - 2; i >= 0; i--){
			if (!queues.some(q => q.index == i + 1) && queues.some(q => q.index == i ? q.index++ + Infinity : false)){
				[queues[i], queues[i+1]] = [queues[i+1], queues[i]];
			}
		}
		queues.forEach(q => q.selected = true);
		redrawQueues();
	},
	"Digit1": () => {
		addRuneAction(0);
	},
	"Digit2": () => {
		addRuneAction(1);
	},
	"Digit3": () => {
		addRuneAction(2);
	},
	"Digit4": () => {
		addRuneAction(3);
	},
	"Digit5": () => {
		addRuneAction(4);
	},
	"Digit6": () => {
		addRuneAction(5);
	},
	"Numpad1": () => {
		addRuneAction(0);
	},
	"Numpad2": () => {
		addRuneAction(1);
	},
	"Numpad3": () => {
		addRuneAction(2);
	},
	"Numpad4": () => {
		addRuneAction(3);
	},
	"Numpad5": () => {
		addRuneAction(4);
	},
	"Numpad6": () => {
		addRuneAction(5);
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
	"Period": () => {
		addActionToQueue(".");
	},
	"Comma": () => {
		addActionToQueue(",");
	},
	">Semicolon": () => {
		addActionToQueue(":");
	},
	"Semicolon": () => {
		addActionToQueue(":");
	},
	"KeyF": () => {
		if (visibleX === null || visibleY === null) return;
		addActionToQueue(`P${visibleX}:${visibleY};`);
		(document.activeElement as HTMLElement).blur();
	}
};

setTimeout(() => {
	document.body.onkeydown = e => {
		if (!document.querySelector("input:focus")) {
			const key = `${e.ctrlKey || e.metaKey ? "^" : ""}${e.shiftKey ? ">" : ""}${e.code}`;
			if (keyFunctions[key]) {
				e.preventDefault();
				keyFunctions[key](e);
			}
		}
	};
	load();
}, 10);

function applyCustomStyling() {
	if (settings.debug_verticalBlocksJustify) {
		(document.querySelector(".vertical-blocks") as HTMLElement).style.justifyContent = settings.debug_verticalBlocksJustify;
	}
}
