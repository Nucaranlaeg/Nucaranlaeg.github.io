interface settings {
	usingBankedTime: boolean;
	running: boolean;
	autoRestart: number;
	useWASD: boolean;
	useDifferentBridges: boolean;
	grindMana: boolean;
	grindStats: boolean;
	loadPrereqs: boolean;
	warnings: boolean;
	followZone: boolean;
	timeline: boolean;
	maxTotalTick: number;
	statGrindPerSec: boolean;
	longWait: number;
	minStatGain: number;
	pauseOnPortal: boolean;
	debug_statIncreaseDivisor?: number;
	debug_verticalBlocksJustify?: string;
}

const MAX_TICK = 250;

const settings: settings = {
	usingBankedTime: true,
	running: true,
	autoRestart: 0,
	useWASD: false,
	useDifferentBridges: true,
	grindMana: false,
	grindStats: false,
	loadPrereqs: false,
	warnings: true,
	followZone: true,
	timeline: true,
	maxTotalTick: 10000,
	statGrindPerSec: false,
	longWait: 5000,
	minStatGain: 0,
	pauseOnPortal: false,
};

function setSetting<T, Y extends any[]>(toggler: (...args: Y) => T, value: T, ...args: Y) {
	for (let i = 0; i < 99; i++) {
		const v = toggler(...args);
		if (v === value) return v;
	}
	return null;
}

function toggleBankedTime() {
	settings.usingBankedTime = !settings.usingBankedTime;
	document.querySelector("#time-banked-toggle")!.innerHTML = settings.usingBankedTime ? "Using" : "Banking";
	return settings.usingBankedTime;
}

function toggleRunning() {
	settings.running = !settings.running;
	document.querySelector("#running-toggle")!.innerHTML = settings.running ? "Running" : "Paused";
	document.querySelector("#running-toggle")!.closest(".option")!.classList.toggle("option-highlighted", !settings.running);
	document.title = "Cavernous II" + (settings.running ? "" : " - Paused");
	return settings.running;
}

enum AutoRestart {
	WaitAny = 0,
	RestartDone = 1,
	RestartAlways = 2,
	WaitAll = 3,
}

function toggleAutoRestart() {
	const autoRestartText = ["Wait when any complete", "Restart when complete", "Restart always", "Wait when all complete"];
	settings.autoRestart = (settings.autoRestart + 1) % autoRestartText.length;
	document.querySelector("#auto-restart-toggle")!.innerHTML = autoRestartText[settings.autoRestart];
	document
		.querySelector("#auto-restart-toggle")!
		.closest(".option")!
		.classList.toggle("option-highlighted", settings.autoRestart === 0);
	return settings.autoRestart;
}

function toggleUseWASD() {
	settings.useWASD = !settings.useWASD;
	document.querySelector("#use-wasd-toggle")!.innerHTML = settings.useWASD ? "Use arrow keys" : "Use WASD";
	document.querySelector("#auto-restart-key")!.innerHTML = settings.useWASD ? "C" : "W";
	document.querySelector("#auto-stat-grind-key")!.innerHTML = settings.useWASD ? "T" : "S";
	return settings.useWASD;
}

function toggleGrindMana(event?: KeyboardEvent) {
	if (event?.ctrlKey || event?.metaKey){
		Route.invalidateRouteCosts();
		return;
	}
	Route.resetHasAttempted();
	settings.grindMana = !settings.grindMana;
	document.querySelector("#grind-mana-toggle")!.innerHTML = settings.grindMana ? "Grinding mana rocks" : "Not grinding mana rocks";
	document.querySelector("#grind-mana-toggle")!.closest(".option")!.classList.toggle("option-highlighted", settings.grindMana);
	settings.grindStats = false;
	document.querySelector("#grind-stat-toggle")!.innerHTML = "Not grinding stats";
	document.querySelector("#grind-stat-toggle")!.closest(".option")!.classList.remove("option-highlighted");
	return settings.grindMana;
}

function toggleGrindStats() {
	settings.grindStats = !settings.grindStats;
	document.querySelector("#grind-stat-toggle")!.innerHTML = settings.grindStats ? "Grinding stats" : "Not grinding stats";
	document.querySelector("#grind-stat-toggle")!.closest(".option")!.classList.toggle("option-highlighted", settings.grindStats);
	settings.grindMana = false;
	document.querySelector("#grind-mana-toggle")!.innerHTML = "Not grinding mana rocks";
	document.querySelector("#grind-mana-toggle")!.closest(".option")!.classList.remove("option-highlighted");
	return settings.grindStats;
}

function toggleLoadPrereqs() {
	settings.loadPrereqs = !settings.loadPrereqs;
	document.querySelector("#load-prereq-toggle")!.innerHTML = settings.loadPrereqs ? "Load prereqs" : "Load only zone route";
	return settings.loadPrereqs;
}

function toggleWarnings() {
	settings.warnings = !settings.warnings;
	document.querySelector("#warnings")!.innerHTML = settings.warnings ? "Showing warnings" : "Not showing warnings";
	return settings.warnings;
}

function toggleFollowZone() {
	settings.followZone = !settings.followZone;
	document.querySelector("#follow-zone-toggle")!.innerHTML = settings.followZone ? "Follow on zone complete" : "Stay on selected zone";
	return settings.followZone;
}

function toggleTimeline() {
	settings.timeline = !settings.timeline;
	document.querySelector("#timeline-toggle")!.innerHTML = settings.timeline ? "Showing timeline" : "Hiding timeline";
	document.querySelector<HTMLElement>("#timelines")!.hidden = !settings.timeline;
	return settings.timeline;
}

function toggleStatGrindPerSec() {
	settings.statGrindPerSec = !settings.statGrindPerSec;
	document.querySelector("#stat-grind-per-sec")!.innerHTML = settings.statGrindPerSec ? "Stat grind strategy: Per sec" : "Stat grind strategy: Total";
	return settings.statGrindPerSec;
}

function togglePauseOnPortal() {
	settings.pauseOnPortal = !settings.pauseOnPortal;
	document.querySelector("#pause-on-portal-toggle")!.innerHTML = settings.pauseOnPortal ? "Pause when entering a portal" : "Do not pause on portal";
	return settings.pauseOnPortal;
}

function setMaxTickTime(element: HTMLInputElement) {
	let value = +element.value;
	if (!isNaN(value)){
		settings.maxTotalTick = Math.max(250, value || 5000);
	}
	element.value = settings.maxTotalTick.toString();
}

function setLongWaitTime(element: HTMLInputElement) {
	let value = +element.value;
	if (!isNaN(value)){
		settings.longWait = Math.max(100, value);
	}
	element.value = settings.longWait.toString();
}

function setMinimumStatGain(element: HTMLInputElement) {
	let value = +element.value;
	if (!isNaN(value)){
		settings.minStatGain = Math.max(0, value);
	}
	element.value = settings.minStatGain.toString();
}

function loadSettings(savedSettings: settings) {
	setSetting(toggleBankedTime, savedSettings.usingBankedTime);
	setSetting(toggleRunning, !!savedSettings.running);
	setSetting(toggleAutoRestart, savedSettings.autoRestart);
	if (!!savedSettings.grindMana) setSetting(toggleGrindMana, !!savedSettings.grindMana);
	if (!!savedSettings.grindStats) setSetting(toggleGrindStats, !!savedSettings.grindStats);
	setSetting(toggleLoadPrereqs, !!savedSettings.loadPrereqs);
	setSetting(toggleFollowZone, !!savedSettings.followZone);
	setSetting(toggleTimeline, !!savedSettings.timeline);
	setSetting(toggleStatGrindPerSec, !!savedSettings.statGrindPerSec);
	const maxTimeInput = <HTMLInputElement>document.querySelector("#max-time");
	if (maxTimeInput) setMaxTickTime(maxTimeInput);
	const longWaitInput = <HTMLInputElement>document.querySelector("#long-wait");
	if (longWaitInput) setLongWaitTime(longWaitInput);
	const minStatGainInput = <HTMLInputElement>document.querySelector("#min-stat-gain");
	if (minStatGainInput) setMinimumStatGain(minStatGainInput);

	Object.assign(settings, savedSettings, settings);
}

const configBox: HTMLElement =
	document.querySelector("#config-box") ??
	(() => {
		throw new Error("No config box found");
	})();

function hideConfig() {
	configBox.hidden = true;
}

function viewConfig() {
	configBox.hidden = false;
}


/************************** Keybindings ******************************/

const fixedKeybindings:{[key:string]:(event:KeyboardEvent)=>void} = {
	// Clone selection
	">Digit1": (e) => selectClone(0, e as unknown as MouseEvent),
	">Digit2": (e) => selectClone(1, e as unknown as MouseEvent),
	">Digit3": (e) => selectClone(2, e as unknown as MouseEvent),
	">Digit4": (e) => selectClone(3, e as unknown as MouseEvent),
	">Digit5": (e) => selectClone(4, e as unknown as MouseEvent),
	">Digit6": (e) => selectClone(5, e as unknown as MouseEvent),
	">Digit7": (e) => selectClone(6, e as unknown as MouseEvent),
	">Digit8": (e) => selectClone(7, e as unknown as MouseEvent),
	">Digit9": (e) => selectClone(8, e as unknown as MouseEvent),
	"^>Digit1": (e) => selectClone(0, e as unknown as MouseEvent),
	"^>Digit2": (e) => selectClone(1, e as unknown as MouseEvent),
	"^>Digit3": (e) => selectClone(2, e as unknown as MouseEvent),
	"^>Digit4": (e) => selectClone(3, e as unknown as MouseEvent),
	"^>Digit5": (e) => selectClone(4, e as unknown as MouseEvent),
	"^>Digit6": (e) => selectClone(5, e as unknown as MouseEvent),
	"^>Digit7": (e) => selectClone(6, e as unknown as MouseEvent),
	"^>Digit8": (e) => selectClone(7, e as unknown as MouseEvent),
	"^>Digit9": (e) => selectClone(8, e as unknown as MouseEvent),
	"Tab": (e:Event) => {
		const previous = zones[currentZone].queues.findIndex(q => q.selected);
		zones[currentZone].queues.forEach((q, i) => q.selected = i == (previous + 1) % clones.length);
		clones[zones[currentZone].queues.findIndex(q => q.selected)].writeStats();
		e.stopPropagation();
	},
	">Tab": (e:Event) => {
		const previous = zones[currentZone].queues.findIndex(q => q.selected);
		zones[currentZone].queues.forEach((q, i) => q.selected = previous == (i + 1) % clones.length);
		clones[zones[currentZone].queues.findIndex(q => q.selected)].writeStats();
		e.stopPropagation();
	},

	// Rune actions
	"Digit1": () => addRuneAction(0),
	"Digit2": () => addRuneAction(1),
	"Digit3": () => addRuneAction(2),
	"Digit4": () => addRuneAction(3),
	"Digit5": () => addRuneAction(4),
	"Digit6": () => addRuneAction(5),
	"Numpad1": () => addRuneAction(0),
	"Numpad2": () => addRuneAction(1),
	"Numpad3": () => addRuneAction(2),
	"Numpad4": () => addRuneAction(3),
	"Numpad5": () => addRuneAction(4),
	"Numpad6": () => addRuneAction(5),

	// Utility
	"Escape": () => hideMessages(),
	"Enter": () => hideMessages(),
	"Backspace": () => addActionToQueue("B"),
	"Delete": () => addActionToQueue("b"),
	"^Backspace": () => clearQueues(),
	"^KeyA": () => zones[currentZone].queues.forEach(q => [q.selected, q.cursor] = [true, null]),
	"End": () => zones[displayZone].queues.forEach(q => q.cursor = null),
	"Home": () => zones[displayZone].queues.forEach(q => q.cursor = -1),
}

const adjustableKeybindings:{[key:string]:(event:KeyboardEvent)=>void} = {
	// Actions
	"ArrowLeft": () => addActionToQueue("L"),
	"ArrowUp": () => addActionToQueue("U"),
	"ArrowRight": () => addActionToQueue("R"),
	"ArrowDown": () => addActionToQueue("D"),
	"Space": () => addActionToQueue("I"),
	"^Space": () => addActionToQueue("T"),

	// Flow
	"Equal": () => addActionToQueue("="),
	">Equal": () => addActionToQueue("+"),
	"NumpadAdd": () => addActionToQueue("+"),
	"Period": () => addActionToQueue("."),
	"Comma": () => addActionToQueue(","),
	">Comma": () => addActionToQueue("<"),
	">Semicolon": () => addActionToQueue(":"),
	"Semicolon": () => addActionToQueue(":"),

	// Config
	"KeyP": () => toggleRunning(),
	"KeyB": () => toggleBankedTime(),
	"KeyG": () => toggleGrindMana(),
	"KeyZ": () => toggleFollowZone(),
	"KeyL": () => togglePauseOnPortal(),
	"KeyQ": () => toggleLoadPrereqs(),

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
	"KeyF": () => {
		if (visibleX === null || visibleY === null) return;
		addActionToQueue(`P${visibleX}:${visibleY};`);
		(document.activeElement as HTMLElement).blur();
	},
}

setTimeout(() => {
	document.body.onkeydown = e => {
		if (!document.querySelector("input:focus")) {
			const key = `${e.ctrlKey || e.metaKey ? "^" : ""}${e.shiftKey ? ">" : ""}${e.code}`;
			if (fixedKeybindings[key]) {
				e.preventDefault();
				fixedKeybindings[key](e);
			}
			if (adjustableKeybindings[key]){
				e.preventDefault();
				adjustableKeybindings[key](e);
			}
		}
	};
}, 10);
