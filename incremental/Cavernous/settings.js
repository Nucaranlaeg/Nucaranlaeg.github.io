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

function loadSettings(savedSettings) {
	do toggleBankedTime();
	while (settings.usingBankedTime != savedSettings.usingBankedTime);

	do toggleRunning();
	while (settings.running != savedSettings.running);

	do toggleAutoRestart();
	while (settings.autoRestart != savedSettings.autoRestart);

	do toggleGrindMana();
	while (settings.grindMana != savedSettings.grindMana);

	Object.assign(settings, savedSettings, settings);
}