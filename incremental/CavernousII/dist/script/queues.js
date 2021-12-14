"use strict";
let actionBarWidth = 0;
let currentClone;
class QueueAction {
    constructor(actionID, queue, status = false) {
        this.currentClone = null;
        this.currentAction = null;
        this.done = ActionStatus.NotStarted;
        this.domNode = null;
        this.lastProgress = 0;
        this.isProgressQueued = false;
        this.actionID = actionID;
        this.queue = queue;
        if (status)
            this.done = ActionStatus.Complete;
        this.drawProgress();
    }
    get started() {
        return this.node?.classList.contains("started");
    }
    get action() {
        if (this.done == ActionStatus.Complete)
            return null;
        if (this.actionID == "T")
            return "I";
        return this.actionID;
    }
    get node() {
        if (this.domNode)
            return this.domNode;
        this.domNode = createActionNode(this.actionID);
        if (this.done == ActionStatus.Complete) {
            this.domNode.classList.add("started");
            this.domNode.style.backgroundSize = "0%";
        }
        return this.domNode;
    }
    drawProgress() {
        if (this.isProgressQueued)
            return;
        this.isProgressQueued = true;
        setTimeout(() => {
            if (this.done == ActionStatus.Started || this.done == ActionStatus.Complete) {
                this.node.classList.add("started");
                if (this.currentAction) {
                    let percent = 1 - this.currentAction.remainingDuration / this.currentAction.startingDuration;
                    percent *= 100;
                    this.node.style.backgroundSize = `${Math.max(0, percent)}%`;
                    if (percent < this.lastProgress + 100 / (0.5 * 60)) { // 0.5 second @ 60fps
                        this.queue.displayActionProgress(percent);
                    }
                    else {
                        this.queue.displayActionProgress(0);
                    }
                    this.lastProgress = percent;
                }
                else {
                    this.node.style.backgroundSize = "100%";
                }
            }
            else {
                this.node.classList.remove("started");
                this.node.style.backgroundSize = "0%";
            }
            this.isProgressQueued = false;
        });
    }
    static fromJSON(ch, queue) {
        ch = this.migrate(ch);
        if (ch[0] == "P") {
            return new QueuePathfindAction(ch, queue);
        }
        return new QueueAction(ch, queue);
    }
    static migrate(ar) {
        return ar;
    }
    start() {
        if (!this.currentClone) {
            this.currentClone = clones[this.queue.index];
        }
        if (this.done == ActionStatus.Started || this.done == ActionStatus.Complete)
            return;
        this.drawProgress();
        if (!this.currentAction) {
            if (!this.action)
                return this.complete();
            if ("LURDI".includes(this.action)) {
                const targetX = this.currentClone.x + +(this.action == "R") - +(this.action == "L");
                const targetY = this.currentClone.y + +(this.action == "D") - +(this.action == "U");
                const location = getMapLocation(targetX, targetY);
                const action = this.action == "I" ? location?.getPresentAction() : location?.getEnterAction();
                if (!action) {
                    this.done = ActionStatus.Complete;
                    return;
                }
                this.currentAction = action;
            }
            else {
                const fakeLocation = new MapLocation(0, 0, new Zone("Not a zone", ["."]), "Not a location");
                this.currentAction = this.action == "." ? new ActionInstance(getAction("Wait"), fakeLocation, false)
                    : this.action == "," ? new ActionInstance(getAction("Long Wait"), fakeLocation, false)
                        : null;
                if (!this.currentAction) {
                    // Perform action immediately
                    if (this.action[0] == "N") {
                        const runeIndex = this.action.match(/N(\d+);/)?.[1];
                        if (!runeIndex)
                            throw new Error(`Ill-formed rune action: ${this.action}`);
                        const created = runes[+runeIndex].create(this.currentClone.x, this.currentClone.y);
                        if (created) {
                            this.complete();
                            this.currentClone.addToTimeline({ name: "Create rune" });
                        }
                        else {
                            this.setWaiting();
                        }
                        return;
                    }
                    switch (this.action) {
                        case "=":
                            this.currentClone.sync();
                            this.setWaiting();
                            this.currentClone.addToTimeline({ name: "Sync" });
                            break;
                        case "+":
                            this.currentClone.noSync();
                            this.complete();
                            break;
                        case ":":
                            if (settings.running)
                                toggleRunning();
                            this.complete();
                            break;
                        case "<":
                            this.complete();
                            break;
                        case "W":
                            this.setWaiting();
                            break;
                        default:
                            throw new Error(`Unrecognized action: ${this.action}`);
                    }
                    return;
                }
            }
        }
        const startSuccess = this.currentAction.start(this.currentClone);
        if (startSuccess == CanStartReturnCode.Now) {
            this.done = ActionStatus.Started;
        }
        else if (startSuccess == CanStartReturnCode.NotNow) {
            this.setWaiting();
        }
        else if (startSuccess == CanStartReturnCode.Never) {
            this.done = ActionStatus.Complete;
        }
    }
    tick(time) {
        if (!this.currentAction)
            throw new Error("Attempted to run uninitialized action");
        if (this.done != ActionStatus.Started) {
            return;
        }
        if (this.currentAction.remainingDuration == 0) {
            if ("LURD".includes(this.action) || this.actionID == "T" || this.currentAction.action.name == "Teleport") {
                // Someone else completed this action; this should have already been taken care of.
                // We can still get here (if, for instance, it happens with an iron bridge onto lava), so no error.
                // Try again with the action.
                this.done = ActionStatus.NotStarted;
            }
            else {
                // Pathfind or someone else completed this action
                this.done = ActionStatus.Complete;
            }
            this.drawProgress();
            return;
        }
        this.currentAction.tick(time, this.currentClone);
        this.drawProgress();
        this.currentClone.remainingTime = this.currentAction.remainingDuration;
        this.currentClone.addToTimeline(this.currentAction.action, time);
        if (this.currentAction.remainingDuration == 0) {
            const targetX = this.currentClone.x + +(this.action == "R") - +(this.action == "L");
            const targetY = this.currentClone.y + +(this.action == "D") - +(this.action == "U");
            if ("LURD".includes(this.action)
                && (targetX != this.currentClone.x || targetY != this.currentClone.y)
                && ".*©".includes(getOffsetCurrentMapTile(targetX, targetY))
                && !["Walk", "Kudzu Chop"].includes(this.currentAction.action.name)) {
                const location = getMapLocation(targetX, targetY);
                const actions = [];
                clones.forEach((c, i) => {
                    const action = zones[currentZone].queues[i].getNextAction();
                    if (!action || action.done == ActionStatus.NotStarted)
                        return;
                    const cloneX = c.x + +(action.action == "R") - +(action.action == "L");
                    const cloneY = c.y + +(action.action == "D") - +(action.action == "U");
                    if (cloneX == targetX && cloneY == targetY) {
                        action.currentAction = new ActionInstance(Object.create(getAction("Walk")), location, true);
                        action.currentAction.start(this.currentClone);
                        actions.push(action.currentAction);
                    }
                });
                if (actions.length > 1) {
                    actions.forEach(a => a.remainingDuration = a.remainingDuration / actions.length);
                }
                else {
                    // Force complete of solo walk;
                    this.currentAction.remainingDuration = 0;
                    this.currentAction.tick(0, this.currentClone);
                    this.complete();
                }
            }
            else {
                this.complete();
            }
        }
        this.drawProgress();
    }
    complete() {
        this.done = this.actionID == "T" ? ActionStatus.NotStarted : ActionStatus.Complete;
        this.drawProgress();
    }
    setWaiting() {
        this.done = this.actionID == "T" ? ActionStatus.Complete : ActionStatus.Waiting;
        this.drawProgress();
    }
    reset() {
        this.done = ActionStatus.NotStarted;
        this.lastProgress = 0;
        this.currentClone = null;
        this.currentAction = null;
        this.drawProgress();
    }
    toString() {
        return this.actionID;
    }
}
class QueuePathfindAction extends QueueAction {
    constructor(actionID, queue, status = false) {
        super(actionID, queue, status);
        this.cacheAction = null;
        const match = this.actionID.match(/P(-?\d+):(-?\d+);/);
        if (match === null)
            throw new Error("Invalid pathfind action");
        let [_, targetX, targetY] = match;
        this.targetXOffset = +targetX;
        this.targetYOffset = +targetY;
    }
    get targetX() {
        return this.targetXOffset + zones[currentZone].xOffset;
    }
    get targetY() {
        return this.targetYOffset + zones[currentZone].yOffset;
    }
    get action() {
        if (this.currentClone === null)
            throw new Error("Pathfind action not initialized");
        if (this.cacheAction)
            return this.cacheAction;
        let originX = this.currentClone.x + zones[currentZone].xOffset, originY = this.currentClone.y + zones[currentZone].yOffset;
        // Do a simple search from the clone's current position to the target position.
        // Return the direction the clone needs to go next.
        let getDistance = (x1, x2, y1, y2) => Math.abs(x1 - x2) + Math.abs(y1 - y2);
        // Prevent pathing to the same spot.
        if (getDistance(originX, this.targetX, originY, this.targetY) == 0) {
            this.done = ActionStatus.Complete;
            this.drawProgress();
            return null;
        }
        let openList = [];
        let closedList = [[originY, originX]];
        if (walkable.includes(zones[currentZone].map[originY - 1][originX]))
            openList.push([originY - 1, originX, 1, getDistance(originX, this.targetX, originY - 1, this.targetY), "U"]);
        if (walkable.includes(zones[currentZone].map[originY + 1][originX]))
            openList.push([originY + 1, originX, 1, getDistance(originX, this.targetX, originY + 1, this.targetY), "D"]);
        if (walkable.includes(zones[currentZone].map[originY][originX - 1]))
            openList.push([originY, originX - 1, 1, getDistance(originX - 1, this.targetX, originY, this.targetY), "L"]);
        if (walkable.includes(zones[currentZone].map[originY][originX + 1]))
            openList.push([originY, originX + 1, 1, getDistance(originX + 1, this.targetX, originY, this.targetY), "R"]);
        while (openList.length > 0) {
            let best_next = openList.reduce((a, c) => a < c[3] ? a : c[3], Infinity);
            let active = openList.splice(openList.findIndex(x => x[3] == best_next), 1)[0];
            if (getDistance(active[1], this.targetX, active[0], this.targetY) == 0) {
                this.cacheAction = active[4];
                return active[4];
            }
            // Add adjacent tiles
            if (walkable.includes(zones[currentZone].map[active[0] - 1][active[1]]) && !closedList.find(x => x[0] == active[0] - 1 && x[1] == active[1]))
                openList.push([active[0] - 1, active[1], active[2] + 1, active[2] + getDistance(active[1], this.targetX, active[0] - 1, this.targetY), active[4]]);
            if (walkable.includes(zones[currentZone].map[active[0] + 1][active[1]]) && !closedList.find(x => x[0] == active[0] + 1 && x[1] == active[1]))
                openList.push([active[0] + 1, active[1], active[2] + 1, active[2] + getDistance(active[1], this.targetX, active[0] + 1, this.targetY), active[4]]);
            if (walkable.includes(zones[currentZone].map[active[0]][active[1] - 1]) && !closedList.find(x => x[0] == active[0] && x[1] == active[1] - 1))
                openList.push([active[0], active[1] - 1, active[2] + 1, active[2] + getDistance(active[1] - 1, this.targetX, active[0], this.targetY), active[4]]);
            if (walkable.includes(zones[currentZone].map[active[0]][active[1] + 1]) && !closedList.find(x => x[0] == active[0] && x[1] == active[1] + 1))
                openList.push([active[0], active[1] + 1, active[2] + 1, active[2] + getDistance(active[1] + 1, this.targetX, active[0], this.targetY), active[4]]);
            // Remove the most recent from consideration
            closedList.push([active[0], active[1]]);
        }
        // Wait if we don't have a path.
        return "W";
    }
    // Pathfind actions don't complete until there's no more path to find.
    complete() {
        this.cacheAction = null;
        this.currentAction = null;
        if (this.done != ActionStatus.Complete)
            this.done = ActionStatus.NotStarted;
    }
}
class ActionQueue extends Array {
    constructor(index, ...items) {
        super(...items);
        this.cursorPos = null;
        this.queueNode = null;
        this.cursorNode = null;
        this.progressNode = null;
        this.index = index;
        items.forEach(a => a.queue = this);
    }
    get cursor() { return this.cursorPos; }
    set cursor(newVal) {
        if (newVal !== null) {
            if (newVal < -1)
                newVal = -1;
            if (newVal > this.length - 2)
                newVal = null;
        }
        this.cursorPos = newVal;
        showCursorLocations();
        if (!this.cursorNode) {
            this.cursorNode = document.querySelector(`#queue${this.index} .cursor`);
            if (!this.cursorNode)
                return;
        }
        if (this.cursorPos === null) {
            this.cursorNode.classList.remove("visible");
        }
        else {
            this.cursorNode.classList.add("visible");
            this.cursorNode.style.left = (this.cursorPos * 16 + 17) + "px";
        }
    }
    get selected() { return clones[this.index].isSelected; }
    set selected(newVal) {
        if (this.selected == newVal)
            return;
        this.cursor = null;
        clones[this.index].isSelected = newVal;
        showCursorLocations();
        if (this.selected) {
            this.node.parentElement.classList.add("selected-clone");
        }
        else {
            this.node.parentElement.classList.remove("selected-clone");
        }
    }
    static fromJSON(ar) {
        ar = this.migrate(ar);
        return ar.map((v, i) => {
            // We assign a queue to the action late, so ignore this error.
            // @ts-ignore
            let q = new ActionQueue(i, ...v.map(e => QueueAction.fromJSON(e, null)));
            q.index = i;
            return q;
        });
    }
    static migrate(ar) {
        return ar;
    }
    addAction(actionID) {
        if (actionID == "B") {
            return this.removeAction();
        }
        // Standard action:     [UDLRI<=+\.,:]
        // Rune action:         N\d+;
        // Repeat-Forge:        T
        // Pathfind action:     P-?\d+:-?\d+;
        if (!actionID.match(/^([UDLRI<=+\.,:]|N\d+;|T|P-?\d+:-?\d+;)$/)) {
            return;
        }
        let done = this.cursor == null ? false // last action, don't skip
            : this.cursor >= 0 ? this[this.cursor].done // middle action, skip if prior is done
                : this[0].started; // first action, skip if next is started
        let newAction = actionID[0] == "P" ? new QueuePathfindAction(actionID, this, Boolean(done))
            : new QueueAction(actionID, this, Boolean(done));
        if (this.cursor == null) {
            this.push(newAction);
            this.queueNode?.append(newAction.node);
        }
        else if (this.cursor >= 0) {
            this.splice(this.cursor + 1, 0, newAction);
            this[this.cursor].node.insertAdjacentElement("afterend", newAction.node);
            this.cursor++;
        }
        else {
            this.unshift(newAction);
            this.queueNode?.insertAdjacentElement("afterbegin", newAction.node);
            this.cursor++;
        }
        this.scrollQueue();
    }
    removeAction() {
        if (this.cursor === null) {
            const action = this.pop();
            if (action === undefined)
                return;
            action.node.remove();
        }
        else {
            if (this.length == 0 || this.cursor == -1)
                return;
            this.splice(this.cursor, 1)[0].node.remove();
            this.cursor--;
        }
    }
    getNextAction() {
        if (clones[this.index].damage === Infinity)
            return null;
        const nextAction = this.find(a => a.done != ActionStatus.Complete) || null;
        if (nextAction === null) {
            const index = this.findIndex(a => a.action == "<");
            if (index > 0 && index < this.length - 1) {
                for (let i = index; i < this.length; i++) {
                    this[i].done = ActionStatus.NotStarted;
                }
                return this.getNextAction();
            }
        }
        return nextAction;
    }
    displayActionProgress(percent) {
        if (!this.progressNode)
            this.progressNode = this.node.parentNode?.querySelector(".work-progress");
        if (!this.progressNode)
            return;
        this.progressNode.style.width = percent + "%";
    }
    hasFutureSync() {
        return this.some(a => (a.done == ActionStatus.NotStarted || a.done == ActionStatus.Waiting) && a.actionID == "=");
    }
    scrollQueue() {
        if (!actionBarWidth)
            return setActionBarWidth(this.node);
        this.node.parentElement.scrollLeft = Math.max((this.cursor !== null ? this.cursor : 0) * 16 - (actionBarWidth / 2), 0);
    }
    get node() {
        if (this.queueNode !== null)
            return this.queueNode;
        this.queueNode = document.querySelector(`#queue${this.index} > .queue-inner`);
        if (this.queueNode !== null)
            return this.queueNode;
        const queueTemplate = document.querySelector("#queue-template");
        if (queueTemplate === null)
            throw new Error("No queue template found");
        const node = queueTemplate.cloneNode(true);
        node.id = `queue${this.index}`;
        document.querySelector("#queues").append(node);
        this.cursorNode = node.querySelector(".cursor");
        this.queueNode = node.querySelector(".queue-inner");
        return this.queueNode;
    }
    clear() {
        this.splice(0, this.length).forEach(action => action.node.remove());
        this.cursor = null;
        countMultipleActions();
    }
    reset() {
        this.forEach(a => a.reset());
    }
    fromString(string) {
        this.clear();
        let prev = "";
        let longAction = "";
        for (let char of string) {
            if (prev && "PN".includes(prev)) {
                if (!longAction.length) {
                    longAction = prev;
                }
                longAction += char;
                if (char != ";")
                    continue;
                this.addAction(longAction);
                longAction = "";
            }
            else if (!"PN".includes(char)) {
                this.addAction(char);
            }
            prev = char;
        }
    }
    toString() {
        return Array.from(this).join("");
    }
}
function selectClone(target, event) {
    const index = +target.id.replace("queue", "");
    if (event.ctrlKey || event.metaKey) {
        zones[displayZone].queues[index].selected = !zones[displayZone].queues[index].selected;
    }
    else {
        zones[displayZone].queues.forEach((q, i) => q.selected = i == index);
    }
}
function getActionValue(action) {
    return +(action.match(/\d+/)?.[0] || 0);
}
function setActionBarWidth(node) {
    actionBarWidth = node.parentElement.clientWidth;
}
function addActionToQueue(action) {
    zones[displayZone].queues.filter(q => q.selected).forEach(q => q.addAction(action));
    showFinalLocation();
    countMultipleActions();
}
function addRuneAction(index) {
    if (index < runes.length && runes[index].canAddToQueue())
        addActionToQueue("N" + index + ";");
}
function clearQueues() {
    if (settings.warnings && !confirm("Really clear selected queues?"))
        return;
    zones[displayZone].queues.forEach(q => q.selected ? q.clear() : null);
}
function createActionNode(action) {
    const actionTemplate = document.querySelector("#action-template");
    if (actionTemplate === null)
        throw new Error("No action template found");
    let actionNode = actionTemplate.cloneNode(true);
    actionNode.removeAttribute("id");
    let character = {
        "L": leftArrowSVG,
        "R": rightArrowSVG,
        "U": upArrowSVG,
        "D": downArrowSVG,
        "I": interactSVG,
        "T": repeatInteractSVG,
        "<": repeatListSVG,
        "=": syncSVG,
        "+": noSyncSVG,
        ".": "...",
        ",": ",,,",
        ":": pauseSVG,
    }[action];
    if (!character) {
        let value = getActionValue(action);
        character = action[0] == "N" ? runes[value].icon
            : action[0] == "P" ? pathfindSVG
                : "";
    }
    actionNode.querySelector(".character").innerHTML = character || "";
    return actionNode;
}
function resetQueueHighlights() {
    zones[currentZone].queues.forEach(queue => {
        queue.forEach(action => action.drawProgress());
        queue.scrollQueue();
    });
}
function countMultipleActions() {
    if (!queuesNode)
        return;
    queuesNode.querySelectorAll(".action-count").forEach(node => {
        node.parentNode?.removeChild(node);
    });
    zones[displayZone].queues.forEach(queue => {
        const queueNode = queue.node;
        let nodes = queueNode.children;
        let actionCount = 0;
        let countedType = null;
        for (let j = 0; j < queue.length; j++) {
            let nextType = queue[j].actionID;
            if (actionCount > 3 && nextType != countedType) {
                let node = document.createElement("div");
                node.classList.add("action-count");
                node.setAttribute("data-count", actionCount.toString());
                node.style.left = `${(j - actionCount) * 16 + 2}px`;
                node.style.width = `${actionCount * 16 - 2}px`;
                if (actionCount > 9)
                    node.classList.add("double-digit");
                queueNode.insertBefore(node, nodes[j - actionCount]);
                actionCount = 0;
                countedType = null;
            }
            if (".,I".includes(nextType) && (countedType == nextType || countedType === null)) {
                actionCount++;
                countedType = nextType;
            }
            else {
                actionCount = 0;
                countedType = null;
            }
        }
    });
}
function clearWorkProgressBars() {
    [...(queuesNode?.querySelectorAll(".work-progress") || [])].forEach(bar => bar.style.width = "0%");
}
function redrawQueues() {
    zones[displayZone].queues.forEach(q => {
        while (q.node.lastChild) {
            q.node.removeChild(q.node.lastChild);
        }
        for (let action of q) {
            let node = action.node;
            q.node.append(node);
        }
    });
    resetQueueHighlights();
    countMultipleActions();
    let timelineEl = document.querySelector(`#timelines`);
    if (timelineEl === null)
        throw new Error("Timelines node not found");
    while (timelineEl.lastChild) {
        timelineEl.removeChild(timelineEl.lastChild);
    }
    for (const c of clones) {
        timelineEl.append(c.timeLineElements[displayZone]);
    }
    clearWorkProgressBars();
}
function setCursor(event, el) {
    const offsetX = event.offsetX;
    setTimeout(() => {
        let nodes = Array.from(el.parentNode?.children || []);
        let queue = zones[displayZone].queues[parseInt(el.parentNode.parentElement.id.replace("queue", ""))];
        queue.cursor = nodes.filter(n => !n.classList.contains("action-count")).findIndex(e => e == el) - +(offsetX < 8);
    });
}
function clearCursors(event, el) {
    if (!event || event.target == el) {
        zones[currentZone].queues.forEach(q => q.cursor = null);
    }
}
function queueToString(queue) {
    return queue.toString();
}
function exportQueues() {
    let exportString = zones[displayZone].queues.map(queue => queueToString(queue));
    navigator.clipboard.writeText(JSON.stringify(exportString));
}
function longExportQueues() {
    let exportString = zones.map(z => z.node ? z.queues.map(queue => queueToString(queue)) : "").filter(q => q);
    navigator.clipboard.writeText(JSON.stringify(exportString));
}
function importQueues() {
    let queueString = prompt("Input your queues");
    if (!queueString)
        return;
    let tempQueues = zones[displayZone].queues.slice();
    try {
        let newQueues = JSON.parse(queueString);
        if (newQueues.length > zones[displayZone].queues.length) {
            alert("Could not import queues - too many queues.");
            return;
        }
        zones[displayZone].queues.map(e => e.clear());
        for (let i = 0; i < newQueues.length; i++) {
            zones[displayZone].queues[i].fromString(newQueues[i]);
        }
        redrawQueues();
    }
    catch {
        alert("Could not import queues.");
        zones[displayZone].queues = tempQueues;
        redrawQueues();
    }
}
function longImportQueues(queueString) {
    if (!queueString) {
        queueString = prompt("Input your queues");
        if (!queueString)
            return;
    }
    let tempQueues = JSON.stringify(zones.map(z => z.node ? z.queues.map(queue => queueToString(queue)) : "").filter(q => q));
    try {
        let newQueues = JSON.parse(queueString);
        if (newQueues.length > zones.length || newQueues.some((q) => q.length > clones.length)) {
            alert("Could not import queues - too many queues.");
            return;
        }
        newQueues.forEach((q, i) => {
            zones[i].queues.map(e => e.clear());
            for (let j = 0; j < q.length; j++) {
                zones[i].queues[j].fromString(q[j]);
            }
        });
        redrawQueues();
    }
    catch {
        alert("Could not import queues.");
        // Clean up any issues
        longImportQueues(tempQueues);
    }
}
//# sourceMappingURL=queues.js.map