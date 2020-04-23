let queues = [];
let selectedQueue = [];
let savedQueues = [];
let cursor = [0, null];

class QueueAction extends Array {
	constructor(actionID, undone = true, ...rest) {
		super(actionID, undone, ...rest);
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
		return new QueueAction(ch);
	}

	static migrate(ar) {
		if (previousVersion < 0.0304) {

		}
		return ar;
	}
}

class QueueReferenceAction extends QueueAction {
	constructor(queueID, undone = true, queueReference) {
		super(queueID, undone, queueReference);
	}
	
	get queueReference() {
		return this[2];
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
		if (previousVersion < 0.0304) {

		}
		return ar;
	}

	addActionAt(actionID, index = cursor[1]) {
		if (actionID == "B") {
			return this.removeActionAt(index);
		}
		
		if (isNaN(+actionID) // not queue reference
		    && !"UDLRI<=".includes(actionID) // not non-rune action
		    && (!"NS".includes(actionID[0]) || isNaN(+actionID[1]))) // not rune action
		{
			return;
		}
		
		let done = index == null ? false // last action, don't skip
		         : index >= 0 ? this[index].done // middle action, skip if prior is done
		         : this[0].started; // first action, skip if next is started
		let newAction = isNaN(+actionID) ? new QueueReferenceAction(actionID, !done, savedQueues[actionID]) : new QueueAction(actionID, !done);
		
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
		let prev = '';
		for (let char of string) {
			if ("NS".includes(prev)) {
				this.addActionAt(prev + char, null);
			} else if (!"NS".includes(char)) {
				this.addActionAt(char, null);
			}
			prev = char;
		}
	}

	toString() {
		return Array.from(this).map(q => {
			return isNaN(+q[0]) ? q[0] : queueToString(savedQueues[q[0]]);
		}).join("");
	}
}

function addActionToQueue(action, queue = null){
	if (document.querySelector(".saved-queue:focus, .saved-name:focus")) return addActionToSavedQueue(action);
	if (queue === null){
		for (let i = 0; i < selectedQueue.length; i++){
			addActionToQueue(action, selectedQueue[i]);
		}
		showFinalLocation();
		return;
	}
	if (queues[queue] === undefined) return;

	queues[queue].addActionAt(action, cursor[1]);

	scrollQueue(queue, cursor[1]);
	showCursor();
}

function addRuneAction(index, type){
	if (type == 'rune'){
		if (index < runes.length && runes[index].canAddToQueue()) addActionToQueue("N" + index);
	} else if (type == 'spell') {
		if (index < spells.length && spells[index].canAddToQueue()) addActionToQueue("S" + index);
	}
}

function clearQueue(queue = null, noConfirm = false){
	if (queue === null){
		if (selectedQueue.length == 0) return;
		if (selectedQueue.length == 1) {
			clearQueue(selectedQueue[0]);
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
	queues[queue].clear();
	if (cursor[0] == queue){
		cursor[1] = null;
	}
	showCursor();
}

function createActionNode(action){
	if (!isNaN(+action)) return createQueueActionNode(action);
	let actionNode = document.querySelector("#action-template").cloneNode(true);
	actionNode.removeAttribute("id");
	let character = {
		"L": settings.useAlternateArrows ? "←" : "🡄",
		"R": settings.useAlternateArrows ? "→" : "🡆",
		"U": settings.useAlternateArrows ? "↑" : "🡅",
		"D": settings.useAlternateArrows ? "↓" : "🡇",
		"I": settings.useAlternateArrows ? "○" : "🞇",
		"<": settings.useAlternateArrows ? "⟲" : "⟲",
		"=": settings.useAlternateArrows ? "=" : "=",
	}[action];
	if (!character){
		character = action[0] == "N" ? runes[action[1]].icon : spells[action[1]].icon;
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

function selectQueueAction(queue, action, percent){
	let queueBlock = queuesNode.children[queue];
	let queueNode = queueBlock.querySelector('.queue-inner');
	this.width = this.width || queueNode.parentNode.clientWidth;
	let nodes = queueNode.children;
	let node = nodes[action];
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
		action = queues[queue].findIndex(a => !a[1]);
	}
	let queueNode = document.querySelector(`#queue${queue} .queue-inner`);
	this.width = this.width || queueNode.parentNode.clientWidth;
	queueNode.parentNode.scrollLeft = Math.max(action * 16 - (this.width / 2), 0);
}

function redrawQueues(){
	for (let i = 0; i < queues.length; i++){
		let queueNode = document.querySelector(`#queue${i} .queue-inner`);
		while (queueNode.firstChild) {
			queueNode.removeChild(queueNode.lastChild);
		}
		for (let action of queues[i]){
			let node = action.node;
			queueNode.append(node);
		}
	}
}

function setCursor(event, el){
	let nodes = Array.from(el.parentNode.children);
	cursor[1] = nodes.findIndex(e => e == el) - (event.offsetX < 8);
	if (nodes.length - 1 == cursor[1]) cursor[1] = null;
	cursor[0] = el.parentNode.parentNode.id.replace("queue", "");
	showCursor();
}

function maybeClearCursor(event, el){
	if (event.target == el){
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

function exportQueues() {
	let exportString = queues.map(queue => queueToString(queue));
	navigator.clipboard.writeText(JSON.stringify(exportString));
}

function importQueues() {
	let queueString = prompt("Input your queues");
	let tempQueues = queues.slice();
	try {
		let newQueues = JSON.parse(queueString);
		if (newQueues.length > queues.length) {
			alert("Could not import queues - too many queues.")
			return;
		}
		queues.map(e => e.clear());
		for (let i = 0; i < newQueues.length; i++) {
			queues[i].fromString(newQueues[i]);
		}
		redrawQueues();
	} catch {
		alert("Could not import queues.");
		queues = tempQueues;
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