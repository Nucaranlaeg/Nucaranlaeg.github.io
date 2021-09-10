let settings = {
	usingBankedTime: true,
	running: true,
	autoRestart: 0,
	useWASD: false,
	useDifferentBridges: true,
	grindMana: false,
	loadPrereqs: false,
	showingRunes: true,
	warnings: true,
}

function setSetting(toggler, value, ...args) {
	for (let i = 0; i < 99; i++) {
		let v = toggler(...args);
		if (v == value) return v;
	}
}

function toggleBankedTime() {
	settings.usingBankedTime = !settings.usingBankedTime;
	document.querySelector("#time-banked-toggle").innerHTML = settings.usingBankedTime ? "Using" : "Banking";
	return settings.usingBankedTime;
}

function toggleRunning() {
	settings.running = !settings.running;
	document.querySelector("#running-toggle").innerHTML = settings.running ? "Running" : "Paused";
	document.querySelector("#running-toggle").closest(".option").classList.toggle("option-highlighted", !settings.running); 
	return settings.running;
}

function toggleAutoRestart() {
	settings.autoRestart = (settings.autoRestart + 1) % 4;
	document.querySelector("#auto-restart-toggle").innerHTML = ["Wait when any complete", "Restart when complete", "Restart always", "Wait when all complete"][settings.autoRestart];
	document.querySelector("#auto-restart-toggle").closest(".option").classList.toggle("option-highlighted", settings.autoRestart == 0); 
	return settings.autoRestart;
}

function toggleUseWASD() {
	settings.useWASD = !settings.useWASD;
	document.querySelector("#use-wasd-toggle").innerHTML = settings.useWASD ? "Use arrow keys" : "Use WASD";
	document.querySelector("#auto-restart-key").innerHTML = settings.useWASD ? "C" : "W";
	return settings.useWASD;
}

function toggleGrindMana() {
	settings.grindMana = !settings.grindMana;
	document.querySelector("#grind-mana-toggle").innerHTML = settings.grindMana ? "Grinding mana rocks" : "Not grinding mana rocks";
	document.querySelector("#grind-mana-toggle").closest(".option").classList.toggle("option-highlighted", settings.grindMana); 
	return settings.grindMana;
}

function toggleLoadPrereqs() {
	settings.loadPrereqs = !settings.loadPrereqs;
	document.querySelector("#load-prereq-toggle").innerHTML = settings.loadPrereqs ? "Load prereqs" : "Load only zone route";
	return settings.loadPrereqs;
}

function toggleWarnings() {
	settings.warnings = !settings.warnings;
	document.querySelector("#warnings").innerHTML = settings.warnings ? "Showing warnings" : "Not showing warnings";
	return settings.warnings;
}

function switchRuneList() {
	settings.showingRunes = !settings.showingRunes;
	document.querySelector("#runes").classList.toggle("active-pane", settings.showingRunes);
	document.querySelector("#spells").classList.toggle("active-pane", !settings.showingRunes);
	return settings.showingRunes;
}

function loadSettings(savedSettings) {

	setSetting(toggleBankedTime, savedSettings.usingBankedTime);

	setSetting(toggleRunning, !!savedSettings.running);

	setSetting(toggleAutoRestart, savedSettings.autoRestart);

	setSetting(toggleGrindMana, !!savedSettings.grindMana);

	setSetting(toggleLoadPrereqs, !!savedSettings.loadPrereqs);

	setSetting(switchRuneList, !!savedSettings.showingRunes);

	Object.assign(settings, savedSettings, settings);
}