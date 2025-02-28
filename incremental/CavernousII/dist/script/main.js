"use strict";
const possibleActionIcons = ["★", "✣", "✦", "♣", "♠", "⚑", "×", "⬈", "⬉", "⬊", "⬋"];
const version = document.querySelector("#version").innerText
    .split(".")
    .map((e, i) => parseInt(e, 36) / 100 ** i)
    .reduce((v, e) => v + e);
let previousVersion;
/** ****************************************** Functions ********************************************/
let skipActionComplete = false;
function getLocationTypeBySymbol(symbol) {
    return locationTypes.find(a => a.symbol == symbol)?.name;
}
function writeNumber(value, decimals = 0) {
    if (value < 10 ** -(decimals + 1))
        value = 0;
    if (value > 100)
        decimals = Math.min(decimals, 1);
    return value.toFixed(decimals);
}
function writeTime(value) {
    if (value == Infinity)
        return "Infinity";
    let hours = Math.floor(value / 3600);
    hours = `${hours ? `${hours}:` : ""}`;
    let minutes = Math.floor((value % 3600) / 60);
    minutes = minutes || hours ? (minutes > 9 ? `${minutes}:` : `0${minutes}:`) : "";
    let seconds = Math.floor((value % 60) * 10) / 10;
    if (value > 100 * 3600)
        seconds = Math.floor(seconds);
    seconds = seconds < 10 && minutes ? `0${seconds.toFixed(value > 100 * 3600 ? 0 : 1)}` : seconds.toFixed(value > 100 * 3600 ? 0 : 1);
    return `${hours}${minutes}${seconds}`;
}
let timeBankNode;
function redrawTimeNode() {
    timeBankNode = timeBankNode || document.querySelector("#time-banked");
    timeBankNode.innerText = writeTime(timeBanked / 1000);
}
window.ondrop = e => e.preventDefault();
/** ****************************************** Prestiges ********************************************/
let resetting = false;
function resetLoop(noLoad = false, saveGame = true) {
    if (resetting)
        return;
    shouldReset = false;
    resetting = true;
    const mana = getStat("Mana");
    if (getMessage("Time Travel").display(zones[0].manaGain == 0 && realms[currentRealm].name == "Core Realm"))
        setSetting(toggleAutoRestart, 3);
    else
        getMessage("Persisted Programming").display();
    if (mana.base == 5.5)
        getMessage("The Looping of Looping Loops").display() && setSetting(toggleAutoRestart, 1);
    if (mana.base == 6)
        getMessage("Strip Mining").display();
    if (mana.base == 7.4)
        getMessage("Buy More Time").display();
    if (routes.length == 3)
        getMessage("All the known ways").display() && setSetting(toggleGrindMana, true);
    if (queueTime > 50000)
        getMessage("Looper's Log: Supplemental").display();
    if (mana.current > 0) {
        currentLoopLog.finalize();
    }
    stuff.forEach(s => {
        s.count = 0;
    });
    stats.forEach((s, i) => {
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
    totalDrain = 0;
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
    if (saveGame)
        save();
    showFinalLocation();
    if (isNaN(timeBanked)) {
        timeBanked = 0;
    }
    resetting = false;
    currentRoutes = [];
}
/** ******************************************* Saving *********************************************/
const URLParams = new URL(document.location.href).searchParams;
let saveName = URLParams.get("save") || "";
saveName = `saveGameII${saveName && "_"}${saveName}`;
const savingDisabled = URLParams.get("saving") == "disabled";
let save = async function save() {
    if (savingDisabled)
        return;
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
    const messageData = messages.map(m => [m.name, m.displayed]);
    const savedRoutes = JSON.parse(JSON.stringify(routes, (key, value) => {
        if (key == "log") {
            return undefined;
        }
        if (key == "usedRoutes") {
            return value ? value.map((r) => r.id) : undefined;
        }
        return value;
    }));
    const runeData = runes.map(r => {
        return {
            name: r.name,
            upgradeCount: r.upgradeCount
        };
    });
    const machines = realms.map(r => r.machineCompletions);
    const realmData = realms.map(r => {
        return {
            maxMult: r.maxMult,
            completed: r.completed,
        };
    });
    let saveGame = {
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
    if (!localStorage[saveName])
        return setup();
    if (savingDisabled)
        return setup();
    let saveGame;
    try {
        // Typescript can't find LZString, and I don't care.
        // @ts-ignore
        saveGame = JSON.parse(LZString.decompressFromBase64(localStorage[saveName]));
    }
    catch {
        // Prior to 2.2.6
        saveGame = JSON.parse(atob(localStorage[saveName]));
    }
    if (!saveGame.routes)
        saveGame.routes = JSON.parse(saveGame.savedRoutes);
    previousVersion = saveGame.version || 2;
    // if (version < previousVersion) {
    // 	alert(`Error: Version number reduced!\n${previousVersion} -> ${version}`);
    // }
    stats.forEach(s => (s.current = 0));
    for (let i = 0; i < saveGame.playerStats.length; i++) {
        const stat = getStat(saveGame.playerStats[i].name);
        if (stat)
            stat.base = saveGame.playerStats[i].base;
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
        if (zone === undefined)
            throw new Error(`No zone "${saveGame.zoneData[i].name}" exists`);
        for (let j = 0; j < saveGame.zoneData[i].locations.length; j++) {
            const mapLocation = zone.getMapLocation(saveGame.zoneData[i].locations[j][0], saveGame.zoneData[i].locations[j][1], true);
            if (mapLocation === null) {
                console.warn(new Error("Tried loading non-existent map location"));
                continue;
            }
            mapLocation.priorCompletionData = saveGame.zoneData[i].locations[j][2];
            while (mapLocation.priorCompletionData.length < realms.length)
                mapLocation.priorCompletionData.push(0);
        }
        zone.queues = ActionQueue.fromJSON(saveGame.zoneData[i].queues);
        zone.routes = ZoneRoute.fromJSON(saveGame.zoneData[i].routes);
        // Challenge for < 2.0.6
        if (saveGame.zoneData[i].goal || saveGame.zoneData[i].challenge)
            zone.completeGoal();
    }
    for (let i = 0; i < realms.length; i++) {
        currentRealm = i;
        realms[i].machineCompletions = (saveGame.machines || [])[i] || 0;
        recalculateMana();
    }
    saveGame.realmData?.forEach((r, i) => {
        if (r.maxMult)
            realms[i].maxMult = r.maxMult;
        if (r.completed)
            realms[i].complete();
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
    if (localStorage[saveName])
        localStorage[saveName + "Backup"] = localStorage[saveName];
    localStorage.removeItem(saveName);
    window.location.reload();
}
function exportGame() {
    navigator.clipboard.writeText(localStorage[saveName]);
}
function importGame() {
    const saveString = prompt("Input your save");
    if (!saveString)
        return;
    save();
    // Disable saving until the next reload.
    save = async () => { };
    const temp = localStorage[saveName];
    localStorage[saveName] = saveString;
    try {
        const queueNode = document.querySelector("#queues");
        queueNode.innerHTML = "";
        load();
    }
    catch (e) {
        console.log(e);
        localStorage[saveName] = temp;
        load();
    }
    window.location.reload();
}
function displaySaveClick(event) {
    let el = event.target.closest(".clickable");
    if (!el)
        return;
    el.classList.add("ripple");
    setTimeout(() => el.classList.remove("ripple"), 1000);
}
/** ****************************************** Game loop ********************************************/
let lastAction = Date.now();
let timeBanked = 0;
let queueTime = 0;
let totalDrain = 0;
let queuesNode;
let queueTimeNode;
let zoneTimeNode;
let queueActionNode;
let loopCompletions = 0;
let gameStatus = { paused: false };
const fps = 60;
let shouldReset = false;
setInterval(function mainLoop() {
    if (zones[0].index === -1 || realms[0].index === -1)
        return;
    if (shouldReset) {
        resetLoop();
    }
    const mana = getStat("Mana");
    queuesNode = queuesNode || document.querySelector("#queues");
    if (isNaN(mana.current) && settings.running)
        toggleRunning();
    const time = Date.now() - lastAction;
    lastAction = Date.now();
    if (settings.running) {
        if (mana.current == 0 || clones.every(c => c.damage === Infinity)) {
            queuesNode.classList.add("out-of-mana");
            // Attempt to update any mana rock currently being mined
            clones.forEach(c => {
                let cloneLoc = zones[currentZone].getMapLocation(c.x, c.y);
                if (cloneLoc?.baseType.name == "Mana-infused Rock") {
                    let action = cloneLoc.getPresentAction();
                    if (action && action.startingDuration > action.remainingDuration) {
                        Route.updateBestRoute(cloneLoc);
                    }
                    const route = getBestRoute(c.x, c.y, currentZone);
                    if (route) {
                        route.hasAttempted = true;
                    }
                }
            });
            currentLoopLog.finalize();
            getMessage("Out of Mana").display();
            if (settings.autoRestart == AutoRestart.RestartAlways || (settings.autoRestart == AutoRestart.RestartDone && clones.every(c => c.repeated))) {
                resetLoop();
            }
        }
        else {
            queuesNode.classList.remove("out-of-mana");
        }
        if (settings.autoRestart == AutoRestart.RestartAlways && zones[currentZone].queues.every(q => !q.getNextAction())) {
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
    if (timeAvailable < 0)
        timeAvailable = 0;
    let timeLeft = runActions(timeAvailable);
    timeBanked += (time + timeLeft - timeAvailable);
    if (timeBanked < 0)
        timeBanked = 0;
    if (zones[currentZone].queues.some(q => q.selected)) {
        clones[zones[currentZone].queues.findIndex(q => q.selected)].writeStats();
    }
    queueTimeNode = queueTimeNode || document.querySelector("#time-spent");
    queueTimeNode.innerText = writeNumber(queueTime / 1000, 1);
    zoneTimeNode = zoneTimeNode || document.querySelector("#time-spent-zone");
    if (currentZone == displayZone) {
        zoneTimeNode.innerText = writeNumber((queueTime - (zones[currentZone].zoneStartTime || 0)) / 1000, 1);
    }
    else {
        zoneTimeNode.innerText = writeNumber(Math.max(0, (zones[displayZone + 1]?.zoneStartTime || 0) - (zones[displayZone].zoneStartTime || 0)) / 1000, 1);
    }
    queueActionNode = queueActionNode || document.querySelector("#actions-spent");
    queueActionNode.innerText = `${writeNumber(loopCompletions, 0)} (x${writeNumber(1 + loopCompletions / 40, 3)})`;
    redrawTimeNode();
    stats.forEach(e => e.update());
    stuff.forEach(e => e.displayDescription());
    if (currentLoopLog == displayedLog)
        displayedLog.display();
    drawMap();
}, Math.floor(1000 / fps));
function runActions(time) {
    const mana = getStat("Mana");
    let loops = 0;
    while (time > 0.001) {
        let actions = zones[currentZone].queues.map(q => q.getNextAction());
        const nullActions = actions.map((a, i) => a === null ? i : -1).filter(a => a > -1);
        actions = actions.filter(a => a !== null);
        if (actions.length == 0) {
            if (settings.autoRestart == AutoRestart.RestartAlways || settings.autoRestart == AutoRestart.RestartDone) {
                resetLoop();
            }
            gameStatus.paused = true;
            return time;
        }
        // Pause ASAP.
        if (actions.some(a => a.actionID == ":")) {
            if (settings.running)
                toggleRunning();
            actions.forEach(a => {
                if (a.action == ":")
                    a.complete();
            });
            return time;
        }
        if (actions.some(a => a.done == ActionStatus.NotStarted)) {
            actions.forEach(a => a.start());
            continue;
        }
        const waitActions = actions.filter(a => a.done != ActionStatus.Started);
        actions = actions.filter(a => a.done == ActionStatus.Started);
        if (zones[currentZone].queues.every((q, i) => clones[i].isSyncing || clones[i].damage == Infinity || clones[i].notSyncing || !q.hasFutureSync())
            && waitActions.some(a => a.action == "=")) {
            waitActions.filter(a => a.action == "=").forEach(a => a.complete());
            clones.forEach(c => c.unSync());
            continue;
        }
        if (actions.length == 0) {
            if (waitActions.length > 0) {
                waitActions.forEach(a => a.start());
            }
            gameStatus.paused = true;
            return time;
        }
        const instances = actions.map(a => a.currentAction);
        if (actions.some(a => a.currentAction?.expectedLeft === 0 && a.actionID == "T")) {
            // If it's started and has nothing left, it's tried to start an action with no duration - like starting a Wither activation when it's complete.
            actions.forEach(a => {
                if (a.currentAction?.expectedLeft === 0 && a.actionID == "T")
                    a.done = ActionStatus.Complete;
            });
            continue;
        }
        let nextTickTime = Math.min(...instances.map(i => i.expectedLeft / instances.reduce((a, c) => a + +(c === i), 0)), time);
        if (nextTickTime < 0.01)
            nextTickTime = 0.01;
        actions.forEach(a => a.tick(nextTickTime));
        nullActions.forEach(a => {
            if (clones[a].damage === Infinity) {
                clones[a].addToTimeline({ name: "Dead" }, nextTickTime);
            }
            else {
                clones[a].addToTimeline({ name: "None" }, nextTickTime);
                getStat("Speed").gainSkill(nextTickTime / 1000);
            }
        });
        waitActions.forEach(a => {
            a.currentClone.addToTimeline({ name: "Wait" }, nextTickTime);
            getStat("Speed").gainSkill(nextTickTime / 1000);
        });
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
function applyCustomStyling() {
    if (settings.debug_verticalBlocksJustify) {
        document.querySelector(".vertical-blocks").style.justifyContent = settings.debug_verticalBlocksJustify;
    }
}
// Calling load directly prevents tests from stopping loading.
setTimeout(() => load(), 15);
//# sourceMappingURL=main.js.map