let queues = [];
let selectedQueue = [];
let savedQueues = [];
let cursor = [0, null];

class QueueAction extends Array {
	constructor(actionID, undone = true, ...rest) {
		super(actionID, undone, ...rest);
	}

	get action() {
		return this[0];
	}

	get actionID() {
		return this[0];
	}
	
	get done() {
		return !this[1];
	}
	
	get started() {
		return this.node.classList.contains('started');
	}
	
	get node() {
		let node = createActionNode(this.actionID);
		if (this.done) {
			node.classList.add("started");
			node.style.backgroundSize = "0%";
		}
		Object.defineValue(this, 'node', node);
		return node;
	}

	static fromJSON(ch) {
		ch = this.migrate(ch);
		if (ch[0] == "Q"){
			return new QueueReferenceAction(ch);
		} else if (ch[0] == "P") {
			return new QueuePathfindAction(ch);
		} else if (ch[0] == "T") {
			return new QueueRepeatInteractAction(ch);
		}
		return new QueueAction(ch);
	}

	static migrate(ar) {
		if (previousVersion < 0.0304) {

		}
		return ar;
	}

	complete() {
		this[1] = false;
	}

	setCaller(clone, index) {
		this.clone = clone;
		this.index = index;
	}
}

class QueueReferenceAction extends QueueAction {
	constructor(queueID, undone = true, queueReference) {
		if (!queueReference) queueReference = savedQueues[getActionValue(queueID)];
		super(queueID, undone, queueReference);
	}

	get queueReference() {
		return this[2];
	}

	get action() {
		if (!this[2]) this[2] = savedQueues[this[0]];
		let nextAction = this[2].find(a => a[`${this.clone}_${this.index}`] === undefined);
		if (!nextAction) return [undefined, -1];
		return [nextAction[0], this.index];
	}

	complete() {
		let nextAction = this[2].find(a => a[`${this.clone}_${this.index}`] === undefined);
		nextAction[`${this.clone}_${this.index}`] = false;
		if (this[2].every(a => a[`${this.clone}_${this.index}`] === false)) this[1] = false;
	}
}

class QueueRepeatInteractAction extends QueueAction {
	get action(){
		let presentAction = zones[currentZone].getMapLocation(clones[this.clone].x, clones[this.clone].y).type.presentAction;
		if (presentAction && presentAction.canStart && presentAction.canStart() > 0){
			return this[0];
		}
		return null;
	}

	complete(force = false){
		let presentAction = zones[currentZone].getMapLocation(clones[this.clone].x, clones[this.clone].y).type.presentAction;
		if (presentAction === null || presentAction.canStart() < 0 || force){
			this[1] = false;
		}
	}
}

class QueuePathfindAction extends QueueAction {
	constructor(actionID, undone = true) {
		super(actionID, undone);
		let [_, targetX, targetY] = this.actionID.match(/P(-?\d+):(-?\d+);/);
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
		let originX = clones[this.clone].x + zones[currentZone].xOffset, originY = clones[this.clone].y + zones[currentZone].yOffset;
		// Do a simple search from the clone's current position to the target position.
		// Return the direction the clone needs to go next.
		let getDistance = (x1, x2, y1, y2) => Math.abs(x1 - x2) + Math.abs(y1 - y2);
		// Prevent pathing to the same spot.
		if (getDistance(originX, this.targetX, originY, this.targetY) == 0) return [undefined, -1];

		let openList = [];
		let closedList = [[originY, originX]];
		if (walkable.includes(zones[currentZone].map[originY - 1][originX]))
			openList.push([originY - 1, originX, 1, getDistance(originX, this.targetX, originY - 1, this.targetY), "U"])
		if (walkable.includes(zones[currentZone].map[originY + 1][originX]))
			openList.push([originY + 1, originX, 1, getDistance(originX, this.targetX, originY + 1, this.targetY), "D"])
		if (walkable.includes(zones[currentZone].map[originY][originX - 1]))
			openList.push([originY, originX - 1, 1, getDistance(originX - 1, this.targetX, originY, this.targetY), "L"])
		if (walkable.includes(zones[currentZone].map[originY][originX + 1]))
			openList.push([originY, originX + 1, 1, getDistance(originX + 1, this.targetX, originY, this.targetY), "R"])
		while (openList.length > 0) {
			let best_next = openList.reduce((a, c) => a < c[3] ? a : c[3], Infinity);
			let active = openList.splice(openList.findIndex(x => x[3] == best_next), 1)[0];
			if (getDistance(active[1], this.targetX, active[0], this.targetY) == 0) return [active[4], this.index];
			// Add adjacent tiles
			if (walkable.includes(zones[currentZone].map[active[0] - 1][active[1]]) && !closedList.find(x => x[0] == active[0] - 1 && x[1] == active[1]))
				openList.push([active[0] - 1, active[1], active[2] + 1, active[2] + getDistance(active[1], this.targetX, active[0] - 1, this.targetY), active[4]])
			if (walkable.includes(zones[currentZone].map[active[0] + 1][active[1]]) && !closedList.find(x => x[0] == active[0] + 1 && x[1] == active[1]))
				openList.push([active[0] + 1, active[1], active[2] + 1, active[2] + getDistance(active[1], this.targetX, active[0] + 1, this.targetY), active[4]])
			if (walkable.includes(zones[currentZone].map[active[0]][active[1] - 1]) && !closedList.find(x => x[0] == active[0] && x[1] == active[1] - 1))
				openList.push([active[0], active[1] - 1, active[2] + 1, active[2] + getDistance(active[1] - 1, this.targetX, active[0], this.targetY), active[4]])
			if (walkable.includes(zones[currentZone].map[active[0]][active[1] + 1]) && !closedList.find(x => x[0] == active[0] && x[1] == active[1] + 1))
				openList.push([active[0], active[1] + 1, active[2] + 1, active[2] + getDistance(active[1] + 1, this.targetX, active[0], this.targetY), active[4]])
			// Remove the most recent from consideration
			closedList.push([active[0], active[1]]);
		}
		return [undefined, -1];
	}

	complete(){
		let originX = clones[this.clone].x + zones[currentZone].xOffset, originY = clones[this.clone].y + zones[currentZone].yOffset;
		if ((originX == this.targetX && originY == this.targetY) || this.action[0] === undefined){
			this[1] = false;
		}
	}
}

class ActionQueue extends Array {
	constructor(...items) {
		super(...items);
	}

	static fromJSON(ar) {
		ar = this.migrate(ar);
		return ar.map((q, i) => {
			q = new ActionQueue(...q.map(e => QueueAction.fromJSON(e)));
			q.index = i;
			return q;
		});
	}

	static migrate(ar) {
		return ar;
	}

	addActionAt(actionID, index = cursor[1]) {
		if (actionID == "B") {
			return this.removeActionAt(index);
		}
		
		// Standard action:        [UDLRI<=]
		// Rune/spell action:      [NS]\d+;
		// Repeat-Forge:           T
		// Queue reference:        Q\d+;
		// Pathfind action:        P-?\d+:-?\d+;
		if (!actionID.match(/^([UDLRI<=]|[NS]\d+;|T|Q\d+;|P-?\d+:-?\d+;)$/)){
			return;
		}
		if (!this[index]){
			maybeClearCursor();
		}
		
		let done = index == null ? false // last action, don't skip
		         : index >= 0 ? this[index].done // middle action, skip if prior is done
				 : this[0].started; // first action, skip if next is started
		let newAction = actionID[0] == "Q" ? new QueueReferenceAction(actionID, !done, savedQueues[getActionValue(actionID)])
		              : actionID[0] == "P" ? new QueuePathfindAction(actionID, !done)
		              : actionID[0] == "T" ? new QueueRepeatInteractAction(actionID, !done)
		              : new QueueAction(actionID, !done);
		
		if (index == null) {
			this.push(newAction);
			this.queueNode.append(newAction.node);
		} else if (index >= 0) {
			this.splice(index + 1, 0, newAction);
			this[index].node.insertAdjacentElement('afterend', newAction.node);
			cursor[1]++;
		} else {
			this.unshift(newAction);
			this.queueNode.insertAdjacentElement('afterbegin', newAction.node);
			cursor[1]++;
		}
	}

	removeActionAt(index = cursor[1]) {
		if (index == null) {
			if (this.length == 0) return;
			this.pop().node.remove();
		} else {
			if (this.length == 0 || index == -1) return;
			this.splice(index, 1)[0].node.remove();
			cursor[1]--;
		}
	}
	
	copyQueueAt(queue, index) {
		if (!(queue instanceof Array)) return;
		let increment = index !== undefined && index !== null;
		for (let item of queue) {
			if (item instanceof QueueAction) {
				this.addActionAt(item.actionID, index);
				increment && index++;
			}
			else {
				this.addActionAt(item[0], index);
				increment && index++;
			}
		}
	}

	get queueNode() {
		let node = document.querySelector(`#queue${this.index} > .queue-inner`);
		Object.defineValue(this, 'queueNode', node);
		return node;
	}

	clear() {
		this.splice(0, this.length);
		this.queueNode.innerText = '';
	}

	fromString(string) {
		this.clear();
		let prev = "";
		let longAction = "";
		for (let char of string) {
			if (prev && "PQNS".includes(prev)) {
				if (!longAction.length){
					longAction = prev;
				}
				longAction += char;
				if (char != ";") continue;
				this.addActionAt(longAction, null);
				longAction = "";
				prev = ";";
				continue;
			} else if (!"PQNS".includes(char)) {
				this.addActionAt(char, null);
			}
			prev = char;
		}
	}

	toString() {
		return Array.from(this).map(q => {
			return q[0] == "Q" ? queueToString(savedQueues[getActionValue(q[0])]) : q[0];
		}).join("");
	}
}

function getActionValue(action){
	return action.match(/\d+/)[0];
}

function addActionToQueue(action, queue = null){
	if (document.querySelector(".saved-queue:focus, .saved-name:focus")) return addActionToSavedQueue(action);
	if (queue === null){
		for (let i = 0; i < selectedQueue.length; i++){
			addActionToQueue(action, selectedQueue[i]);
			scrollQueue(selectedQueue[i], cursor[1]);
		}
		showFinalLocation();
		if ("IB".includes(action)){
			countMultipleInteracts();
		}
		return;
	}
	if (queues[queue] === undefined) return;

	zones[displayZone].queues[queue].addActionAt(action, cursor[1]);

	scrollQueue(queue, cursor[1]);
	showCursor();
	if ("IB".includes(action)){
		countMultipleInteracts();
	}
}

function addRuneAction(index, type){
	if (type == 'rune'){
		if (index < runes.length && runes[index].canAddToQueue()) addActionToQueue("N" + index + ";");
	} else if (type == 'spell') {
		if (index < spells.length && spells[index].canAddToQueue()) addActionToQueue("S" + index + ";");
	}
}

function clearQueue(queue = null, noConfirm = false){
	if (queue === null){
		if (selectedQueue.length == 0) return;
		if (selectedQueue.length == 1) {
			clearQueue(selectedQueue[0], noConfirm);
		} else {
			if (selectedQueue.length == queues.length) {
				if (!noConfirm && !confirm("Really clear ALL queues?")) return;
			} else {
				if (!noConfirm && !confirm("Really clear ALL selected queues?")) return;
			}
			for (let i = 0; i < selectedQueue.length; i++) {
				clearQueue(selectedQueue[i], true);
			}
		}
		return;
	}
	if (!noConfirm && !confirm("Really clear queue?")) return;
	zones[displayZone].queues[queue].clear();
	if (cursor[0] == queue){
		cursor[1] = null;
	}
	showCursor();
}

function createActionNode(action){
	if (action[0] == "Q") return createQueueActionNode(getActionValue(action));
	let actionNode = document.querySelector("#action-template").cloneNode(true);
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
	}[action];
	if (!character){
		let value = getActionValue(action);
		character = action[0] == "N" ? runes[value].icon
		          : action[0] == "S" ? spells[value].icon
		          : action[0] == "P" ? pathfindSVG
		          : "";
	}
	actionNode.querySelector(".character").innerHTML = character;
	return actionNode;
}

function createQueueActionNode(queue){
	let actionNode = document.querySelector("#action-template").cloneNode(true);
	actionNode.removeAttribute("id");
	actionNode.style.color = savedQueues[queue].colour;
	actionNode.querySelector(".character").innerHTML = savedQueues[queue].icon;
	actionNode.setAttribute("title", savedQueues[queue].name);
	actionNode.classList.add(`action${queue}`);
	return actionNode;
}

function resetQueueHighlight(queue){
	let nodes = document.querySelectorAll(`#queue${queue} .queue-inner .started`);
	nodes.forEach(n => n.classList.remove("started"));
}

function highlightCompletedActions(){
	if (!queuesNode) return;
	for (let i = 0; i < zones[displayZone].queues.length; i++){
		let queueBlock = queuesNode.children[i];
		let queueNode = queueBlock.querySelector('.queue-inner');
		let nodes = queueNode.children;
		for (let j = 0; j < zones[displayZone].queues[i].length; j++){
			if (zones[displayZone].queues[i][j][1]){
				nodes[j].classList.remove('started');
				nodes[j].style.backgroundSize = "0%";
			} else {
				nodes[j].classList.add('started');
				nodes[j].style.backgroundSize = "100%";
			}
		}
	}
}

function countMultipleInteracts(){
	if (!queuesNode) return;
	queuesNode.querySelectorAll(".interact-count").forEach(node => {
		node.parentNode.removeChild(node);
	});
	for (let i = 0; i < zones[displayZone].queues.length; i++){
		let queueBlock = queuesNode.children[i];
		let queueNode = queueBlock.querySelector('.queue-inner');
		let nodes = queueNode.children;
		let interactCount = 0;
		for (let j = 0; j < zones[displayZone].queues[i].length + 1; j++){
			if (zones[displayZone].queues[i][j]?.[0] == "I"){
				interactCount++;
			} else if (interactCount > 3) {
				let node = document.createElement("div");
				node.classList.add("interact-count");
				node.setAttribute("data-count", interactCount);
				node.style.left = `${(j - interactCount) * 16 + 2}px`;
				node.style.width = `${interactCount * 16 - 2}px`;
				if (interactCount > 9) node.classList.add("double-digit");
				queueNode.insertBefore(node, nodes[j - interactCount]);
				interactCount = 0;
			} else {
				interactCount = 0;
			}
		}
	}
}

function selectQueueAction(queue, action, percent){
	let queueBlock = queuesNode.children[queue];
	let queueNode = queueBlock.querySelector('.queue-inner');
	this.width = this.width || queueNode.parentNode.clientWidth;
	let nodes = queueNode.children;
	let node = nodes[action];
	if (!node && percent == 100){
		// This occurs whenever there's a zone change
		return;
	}
	node.classList.add('started');
	if (queues[queue][action][2]){
		let complete = queues[queue][action][2].findIndex(q => q[`${queue}_${action}`] === undefined);
		percent /= queues[queue][action][2].length;
		percent += (complete / queues[queue][action][2].length) * 100;
	}
	node.style.backgroundSize = `${Math.max(0, percent)}%`;
	let workProgressBar = queueBlock.querySelector('.work-progress');
	let lastProgess = +workProgressBar.style.width.replace("%", "");
	if (percent < lastProgess) {
		workProgressBar.style.width = "0%";
		lastProgess = 0
	}
	if (percent < lastProgess + 100/(1*60)){ // 1s@60fps
		workProgressBar.style.width = percent + "%";
	} else if (lastProgess) {
		workProgressBar.style.width = "0%";
	}
	// queueNode.parentNode.scrollLeft = Math.max(action * 16 - (this.width / 2), 0);
}

function scrollQueue(queue, action = null){
	if (action === null){
		action = queues[queue].length;
	}
	let queueNode = document.querySelector(`#queue${queue} .queue-inner`);
	this.width = this.width || queueNode.parentNode.clientWidth;
	queueNode.parentNode.scrollLeft = Math.max(action * 16 - (this.width / 2), 0);
}

function redrawQueues(){
	for (let i = 0; i < zones[displayZone].queues.length; i++){
		let queueNode = document.querySelector(`#queue${i} .queue-inner`);
		while (queueNode.firstChild) {
			queueNode.removeChild(queueNode.lastChild);
		}
		for (let action of zones[displayZone].queues[i]){
			let node = action.node;
			queueNode.append(node);
		}
	}
	highlightCompletedActions();
	countMultipleInteracts();
	let timelineEl = document.querySelector(`#timelines`);
	while (timelineEl.firstChild) {
		timelineEl.removeChild(timelineEl.lastChild);
	  }
	clones.forEach(c => {
		timelineEl.append(c.timeLineElements[displayZone]);
	})
}

function setCursor(event, el){
	let nodes = Array.from(el.parentNode.children);
	cursor[1] = nodes.filter(n => !n.classList.contains("interact-count")).findIndex(e => e == el) - (event.offsetX < 8);
	if (nodes.length - 1 == cursor[1]) cursor[1] = null;
	cursor[0] = el.parentNode.parentNode.id.replace("queue", "");
	showCursor();
}

function maybeClearCursor(event, el){
	if (!event || event.target == el){
		cursor[1] = null;
	}
}

function showCursor(){
	document.querySelectorAll(".cursor.visible").forEach(el => el.classList.remove("visible"));
	if (cursor[1] == null) return;
	let cursorNode = document.querySelector(`#queue${cursor[0]} .cursor`);
	if (!cursorNode){
		cursor = [0, null];
		return;
	}
	cursorNode.classList.add("visible");
	cursorNode.style.left = (cursor[1] * 16 + 17) + "px";
}

function queueToString(queue) {
	return queue.toString();
}

function queueToStringStripped(queue) {
	let strippedQueue = queue.filter((q, i) => !q[1] || (!queue[i-1][1] && q[0] == "I"));
	return strippedQueue.toString();
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
	let tempQueues = zones[displayZone].queues.slice();
	try {
		let newQueues = JSON.parse(queueString);
		if (newQueues.length > zones[displayZone].queues.length) {
			alert("Could not import queues - too many queues.")
			return;
		}
		zones[displayZone].queues.map(e => e.clear());
		for (let i = 0; i < newQueues.length; i++) {
			zones[displayZone].queues[i].fromString(newQueues[i]);
		}
		redrawQueues();
	} catch {
		alert("Could not import queues.");
		zones[displayZone].queues = tempQueues;
	}
}

function longImportQueues() {
	let queueString = prompt("Input your queues");
	if (!queueString) return;
	let tempQueues = zones.map(z => z.node ? z.queues.map(queue => queueToString(queue)) : "");
	try {
		let newQueues = JSON.parse(queueString);
		if (newQueues.length > zones.length || newQueues.some(q => q.length > clones.length)) {
			alert("Could not import queues - too many queues.")
			return;
		}
		newQueues.forEach((q, i) => {
			zones[i].queues.map(e => e.clear());
			for (let j = 0; j < q.length; j++) {
				zones[i].queues[j].fromString(q[j]);
			}
		});
		redrawQueues();
	} catch {
		alert("Could not import queues.");
		longImportQueues(tempQueues);
	}
}



Object.defineValue = function(o, name, value = name, enumerable = false) {
	if (typeof name == 'function')
		name = name.name
	return Object.defineProperty(o, name, {
		enumerable,
		configurable: true,
		writable: true,
		value
	})
}