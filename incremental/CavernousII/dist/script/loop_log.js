"use strict";
class LoopLog {
    constructor() {
        this.actions = {};
        this.current = true;
        this.goldVaporizedCount = 0;
        this.goldVaporizedMana = 0;
        this.kept = false;
        this.queues = [];
        this.manaMined = false;
        this.node = null;
        this.zoneNames = ["z1"];
        this.stats = stats.map(s => {
            return {
                base: s.base,
                current: s.base,
            };
        });
    }
    addQueueAction(clone, actionId) {
        while (this.queues.length <= clone) {
            this.queues.push([""]);
        }
        this.queues[clone][this.queues[clone].length - 1] += actionId;
    }
    moveZone(zoneName) {
        if (this.queues.length) {
            zones[this.queues[0].length - 1].queues.forEach((q, i) => {
                const action = q.getNextAction();
                if (action) {
                    this.addQueueAction(i, action.actionID);
                }
            });
        }
        this.queues.forEach(q => q.push(""));
        if (zoneName === "Zone 1" || zoneName === "z1")
            return;
        this.zoneNames.push(zoneName);
    }
    addActionTime(name, zone, time) {
        if (!this.actions[name]) {
            this.actions[name] = [];
        }
        while (this.actions[name].length <= zone) {
            this.actions[name].push(0);
        }
        this.actions[name][zone] += time;
    }
    vaporizeGold(count, mana) {
        this.goldVaporizedCount += count;
        this.goldVaporizedMana += mana;
    }
    finalize() {
        // Don't save 0 length logs.
        if (Object.values(this.actions).reduce((a, c) => a + c.reduce((acc, cur) => acc + cur, 0), 0) < 10) {
            currentLoopLog = new LoopLog();
            return;
        }
        stats.forEach((s, i) => {
            this.stats[i].current = s.current - this.stats[i].current;
            this.stats[i].base = s.base - this.stats[i].base;
            GrindRoute.updateBestRoute(s.name, this.stats[i].current);
        });
        this.current = false;
        currentLoopLog = new LoopLog();
        previousLoopLogs.push(this);
        previousLoopLogs.forEach(log => log.node = null);
        const ephemeralLogCount = previousLoopLogs.filter(l => !l.kept).length;
        if (ephemeralLogCount > MAX_EPHEMERAL_LOGS) {
            let filtered = false;
            previousLoopLogs = previousLoopLogs.filter(l => filtered || l.kept || ((filtered = true) && false));
        }
        if (displayedLog === this) {
            this.display();
        }
    }
    display(zone = -1) {
        loopLogBox.hidden = false;
        displayedLog = this;
        this.displayActions(zone);
        this.displayStats();
        this.displayHeader(zone);
        displayLogs();
    }
    displayActions(zone) {
        const loopActionNode = loopLogBox.querySelector("#loop-actions");
        while (loopActionNode.lastChild) {
            loopActionNode.removeChild(loopActionNode.lastChild);
        }
        let actions = Object.entries(this.actions);
        if (zone === -1) {
            actions = actions.sort((a, b) => b[1].reduce((acc, cur) => acc + cur, 0) - a[1].reduce((acc, cur) => acc + cur, 0));
        }
        else {
            actions = actions.sort((a, b) => (b[1][zone] || 0) - (a[1][zone] || 0));
        }
        const totalActionNode = logEntryTemplate.cloneNode(true);
        totalActionNode.querySelector(".name").innerHTML = "Total clone-seconds";
        totalActionNode.querySelector(".value").innerHTML = writeNumber(actions.filter(a => !["Frost", "Barrier Drain"].includes(a[0]))
            .reduce((a, c) => a + c[1]
            .reduce((acc, cur) => acc + cur, 0), 0) / 1000, 1);
        totalActionNode.style.fontWeight = "bold";
        loopActionNode.append(totalActionNode);
        for (let i = 0; i < actions.length; i++) {
            const actionValue = (zone === -1 ? actions[i][1].reduce((acc, cur) => acc + cur, 0) : actions[i][1][zone]) / 1000;
            if (actionValue === 0 || isNaN(actionValue))
                continue;
            const node = logEntryTemplate.cloneNode(true);
            node.classList.add(actions[i][0].replace(/ /g, "-"));
            node.querySelector(".name").innerHTML = actions[i][0];
            node.querySelector(".value").innerHTML = writeNumber(actionValue, 1);
            loopActionNode.append(node);
            node.querySelector(".description").innerHTML = `Relevant stats:<br>${getAction(actions[i][0])?.stats.map(s => `${s[0].name}: ${s[1]}`).join("<br>") || ""}`;
            node.style.color = setRGBContrast(window.getComputedStyle(node).backgroundColor);
        }
        // Decide whether a scrollbar is needed
        if (+getComputedStyle(loopActionNode).height.replace("px", "") > +getComputedStyle(document.body).height.replace("px", "") * 0.68) {
            loopActionNode.style.overflowY = "auto";
        }
        else {
            loopActionNode.style.overflowY = "unset";
        }
    }
    displayStats() {
        const loopStatNode = loopLogBox.querySelector("#loop-stats");
        while (loopStatNode.lastChild) {
            loopStatNode.removeChild(loopStatNode.lastChild);
        }
        const totalStatNode = statLogEntryTemplate.cloneNode(true);
        totalStatNode.querySelector(".name").innerHTML = "Total stats gained";
        totalStatNode.style.fontWeight = "bold";
        loopStatNode.append(totalStatNode);
        let totalStats = 0;
        for (let i = 0; i < this.stats.length; i++) {
            if (!stats[i].learnable ||
                (this.stats[i].current === 0 && this !== currentLoopLog) ||
                this.stats[i].current === stats[i].current ||
                Object.keys(this.actions).length === 0) {
                continue;
            }
            const node = statLogEntryTemplate.cloneNode(true);
            node.querySelector(".name").innerHTML = stats[i].name;
            if (this.current) {
                node.querySelector(".current-value").innerHTML = writeNumber(stats[i].current - this.stats[i].current, 3);
                node.querySelector(".base-value").innerHTML = writeNumber(stats[i].base - this.stats[i].base, 3);
                totalStats += stats[i].base - this.stats[i].base;
            }
            else {
                node.querySelector(".current-value").innerHTML = writeNumber(this.stats[i].current, 3);
                node.querySelector(".base-value").innerHTML = writeNumber(this.stats[i].base, 3);
                totalStats += this.stats[i].base;
            }
            loopStatNode.append(node);
        }
        totalStatNode.querySelector(".base-value").innerHTML = writeNumber(totalStats, 3);
    }
    displayHeader(zone) {
        loopGoldCountNode.innerHTML = this.goldVaporizedCount.toString();
        loopGoldValueNode.innerHTML = writeNumber(this.goldVaporizedMana, 3);
        loadLoopNode.style.display = this.current ? "none" : "inline-block";
        loadLoopNode.onclick = e => {
            longImportQueues(this.queues);
            resetLoop();
        };
        const loopZoneNode = loopLogBox.querySelector("#loop-log-zones");
        while (loopZoneNode.lastChild) {
            loopZoneNode.removeChild(loopZoneNode.lastChild);
        }
        const zoneCount = this.queues[0]?.length || 0;
        for (let i = -1; i < zoneCount; i++) {
            const zoneNode = loopZoneTemplate.cloneNode(true);
            zoneNode.innerHTML = i < 0 ? "All" : this.zoneNames[i];
            if (i === zone)
                zoneNode.classList.add("active");
            const changeLogZone = ((z) => (e) => {
                e.stopPropagation();
                this.display(z);
            })(i);
            zoneNode.onmousedown = changeLogZone;
            zoneNode.onmouseup = changeLogZone;
            loopZoneNode.append(zoneNode);
        }
    }
}
let currentLoopLog = new LoopLog();
let previousLoopLogs = [];
let displayedLog = null;
const loopLogBox = document.querySelector("#loop-log-box");
if (loopLogBox === null)
    throw new Error("No loop log box found");
const logEntryTemplate = document.querySelector("#log-entry-template");
logEntryTemplate.removeAttribute("id");
const statLogEntryTemplate = document.querySelector("#stat-log-entry-template");
statLogEntryTemplate.removeAttribute("id");
const previousLogTemplate = document.querySelector("#previous-log-template");
previousLogTemplate.removeAttribute("id");
const MAX_EPHEMERAL_LOGS = 10;
const loopGoldCountNode = document.querySelector("#loop-gold-count");
const loopGoldValueNode = document.querySelector("#loop-gold-value");
const loopZoneTemplate = document.querySelector("#loop-zone-template");
const loadLoopNode = document.querySelector("#load-loop-log");
function displayLogs() {
    const loopPrevNode = loopLogBox.querySelector("#loop-prev-list");
    while (loopPrevNode.lastChild) {
        loopPrevNode.removeChild(loopPrevNode.lastChild);
    }
    if (currentLoopLog.node) {
        currentLoopLog.node.querySelector(".value").innerHTML = writeNumber(Object.values(currentLoopLog.actions).reduce((a, c) => a + c.reduce((acc, cur) => acc + cur, 0), 0) / 1000, 1) + " cs";
    }
    else {
        currentLoopLog.node = previousLogTemplate.cloneNode(true);
        currentLoopLog.node.querySelector(".pin").classList.add("disabled");
        currentLoopLog.node.querySelector(".name").innerHTML = "Current";
        currentLoopLog.node.querySelector(".value").innerHTML = writeNumber(Object.values(currentLoopLog.actions).reduce((a, c) => a + c.reduce((acc, cur) => acc + cur, 0), 0) / 1000, 1) + " cs";
        currentLoopLog.node.onclick = e => {
            previousLoopLogs.forEach(log => log.node?.classList.remove("selected"));
            currentLoopLog.display();
            e.stopPropagation();
        };
        if (displayedLog === currentLoopLog)
            currentLoopLog.node.classList.add("selected");
    }
    loopPrevNode.append(currentLoopLog.node);
    for (let i = previousLoopLogs.length - 1; i >= 0; i--) {
        const log = previousLoopLogs[i];
        if (!log.node) {
            log.node = previousLogTemplate.cloneNode(true);
            if (log.manaMined)
                log.node.classList.add("mana-mined");
            if (log.kept)
                log.node.querySelector(".pin").classList.add("pinned");
            log.node.querySelector(".pin").onmousedown = () => log.kept = !log.kept;
            log.node.querySelector(".name").innerHTML = "Previous";
            log.node.querySelector(".value").innerHTML = writeNumber(Object.values(log.actions).reduce((a, c) => a + c.reduce((acc, cur) => acc + cur, 0), 0) / 1000, 1) + " cs";
            log.node.onclick = e => {
                previousLoopLogs.forEach(prevLog => prevLog.node?.classList.remove("selected"));
                currentLoopLog.node?.classList.remove("selected");
                log.display();
                e.stopPropagation();
            };
        }
        if (displayedLog === log)
            log.node.classList.add("selected");
        loopPrevNode.append(log.node);
    }
}
function hideLoopLog() {
    loopLogBox.hidden = true;
    displayedLog = null;
}
//# sourceMappingURL=loop_log.js.map