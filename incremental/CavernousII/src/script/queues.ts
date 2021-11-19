let queues:ActionQueue[] = [];
let selectedQueues:{
	clone: number;
	pos: number | null;
}[] = [];
let savedQueues:SavedActionQueue[] = [];

class QueueAction extends Array {
	index: number | null = null;
	clone: number | null = null;
	constructor(actionID:string, undone = true, ...rest: any) {
		// Spread should work fine into an array
		// @ts-ignore
		super(actionID, undone, ...rest);
	}

	get action():string | null {
		return this[0];
	}

	get actionID():string {
		return this[0];
	}

	get done():boolean {
		return !this[1];
	}

	get started() {
		return this.node?.classList.contains("started");
	}

	get node() {
		let node = createActionNode(this.actionID);
		if (this.done) {
			node.classList.add("started");
			node.style.backgroundSize = "0%";
		}
		DefineObjectValue(this, "node", node);
		return node;
	}

	static fromJSON(ch:string) {
		ch = this.migrate(ch);
		if (ch[0] == "Q"){
			// return new QueueReferenceAction(ch);
			// throw new Error("QueueReferenceAction is disabled");
		} else if (ch[0] == "P") {
			return new QueuePathfindAction(ch);
		} else if (ch[0] == "T") {
			return new QueueRepeatInteractAction(ch);
		}
		return new QueueAction(ch);
	}

	static migrate(ar: string) {
		if (previousVersion < 0.0304) {

		}
		return ar;
	}

	complete(force = false) {
		this[1] = false;
	}

	setCaller(clone: number, index: number) {
		this.clone = clone;
		this.index = index;
	}
}

class QueueReferenceAction extends QueueAction {
	constructor(queueID: string, undone = true, queueReference: SavedActionQueue) {
		if (!queueReference) queueReference = savedQueues[getActionValue(queueID)];
		super(queueID, undone, queueReference);
	}

	get queueReference() {
		return this[2];
	}

	get action(): string {
		if (!this[2]) this[2] = savedQueues[this[0]];
		let nextAction = this[2].find((a: any) => a[`${this.clone}_${this.index}`] === undefined);
		if (!nextAction) return "";
		return nextAction[0];
	}

	complete() {
		let nextAction = this[2].find((a: any) => a[`${this.clone}_${this.index}`] === undefined);
		nextAction[`${this.clone}_${this.index}`] = false;
		if (this[2].every((a: any) => a[`${this.clone}_${this.index}`] === false)) this[1] = false;
	}
}

class QueueRepeatInteractAction extends QueueAction {
	get action(){
		let presentAction = zones[currentZone].getMapLocation(clones[this.clone!].x, clones[this.clone!].y)?.type.presentAction;
		// Typescript can't read its own function types.
		// @ts-ignore
		if (presentAction && presentAction.canStart && presentAction.canStart() > 0){
			return this[0];
		}
		return null;
	}

	complete(force = false){
		const location = zones[currentZone].getMapLocation(clones[this.clone!].x, clones[this.clone!].y);
		if (location === null) throw (new Error("Tried loading non existant map location"))
		let presentAction = location.type.presentAction;
		// Typescript can't read its own function types.
		// @ts-ignore
		if ((presentAction === null) || presentAction.canStart!() < 0 || force){
			this[1] = false;
		}
	}
}

class QueuePathfindAction extends QueueAction {
	targetXOffset: number;
	targetYOffset: number;
	constructor(actionID: string, undone = true) {
		super(actionID, undone);
		const match = this.actionID.match(/P(-?\d+):(-?\d+);/);
		if (match === null) throw new Error("Invalid pathfind action");

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
		let originX = clones[this.clone!].x + zones[currentZone].xOffset, originY = clones[this.clone!].y + zones[currentZone].yOffset;
		// Do a simple search from the clone's current position to the target position.
		// Return the direction the clone needs to go next.
		let getDistance = (x1: number, x2: number, y1: number, y2: number) => Math.abs(x1 - x2) + Math.abs(y1 - y2);
		// Prevent pathing to the same spot.
		if (getDistance(originX, this.targetX, originY, this.targetY) == 0) return null;

		let openList: [number, number, number, number, string][] = [];
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
			if (getDistance(active[1], this.targetX, active[0], this.targetY) == 0) return active[4];
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
		// Wait if we don't have a path.
		return "W";
	}

	complete(){
		let originX = clones[this.clone!].x + zones[currentZone].xOffset, originY = clones[this.clone!].y + zones[currentZone].yOffset;
		if ((originX == this.targetX && originY == this.targetY) || this.action === null){
			this[1] = false;
		}
	}
}

class ActionQueue extends Array<QueueAction> {
	index: any;
	constructor(...items:QueueAction[]) {
		super(...items);
	}

	static fromJSON(ar:string[][]) {
		ar = this.migrate(ar);
		return ar.map((v, i) => {
			let q = new ActionQueue(...v.map(e => QueueAction.fromJSON(e)));
			q.index = i;
			return q;
		});
	}

	static migrate(ar:string[][]) {
		return ar;
	}

	addActionAt(actionID: string, index: number | null) {
		if (actionID == "B") {
			return this.removeActionAt(index);
		}

		// Standard action:     [UDLRI<=+\.,:]
		// Rune/spell action:   [NS]\d+;
		// Repeat-Forge:        T
		// Queue reference:     Q\d+;          Removed for now.
		// Pathfind action:     P-?\d+:-?\d+;
		if (!actionID.match(/^([UDLRI<=+\.,:]|[NS]\d+;|T|P-?\d+:-?\d+;)$/)){
			return;
		}
		if (index && index > 0 && !this[index]){
			clearCursors();
		}

		let done = index == null ? false // last action, don't skip
		         : index >= 0 ? this[index].done // middle action, skip if prior is done
		         : this[0].started; // first action, skip if next is started
		let newAction = //actionID[0] == "Q" ? new QueueReferenceAction(actionID, !done, savedQueues[getActionValue(actionID)]):
		                actionID[0] == "P" ? new QueuePathfindAction(actionID, !done)
		              : actionID[0] == "T" ? new QueueRepeatInteractAction(actionID, !done)
		              : new QueueAction(actionID, !done);

		if (index == null) {
			this.push(newAction);
			this.queueNode?.append(newAction.node);
		} else if (index >= 0) {
			this.splice(index + 1, 0, newAction);
			this[index].node.insertAdjacentElement("afterend", newAction.node);
			let cursor = selectedQueues.find(q => q.clone == this.index);
			if (cursor && cursor.pos !== null) cursor.pos++;
		} else {
			this.unshift(newAction);
			this.queueNode?.insertAdjacentElement("afterbegin", newAction.node);
			let cursor = selectedQueues.find(q => q.clone == this.index);
			if (cursor && cursor.pos !== null) cursor.pos++;
		}
		showCursorLocations();
	}

	removeActionAt(index: number | null) {
		if (index === null) {
			const action = this.pop();
			if (action === undefined) return;
			action.node.remove();
		} else {
			if (this.length == 0 || index == -1) return;
			this.splice(index, 1)[0].node.remove();
			let cursor = selectedQueues.find(q => q.clone == this.index);
			if (cursor && cursor.pos !== null) cursor.pos--;
		}
		showCursorLocations();
	}

	copyQueueAt(queue:unknown, index:number | null) {
		if (!(queue instanceof Array)) return;
		let increment = index !== undefined && index !== null;
		for (let item of queue) {
			if (item instanceof QueueAction) {
				this.addActionAt(item.actionID, index);
			}
			else {
				this.addActionAt(item[0], index);
			}
			if (increment){
				increment && index!++
			};
		}
	}

	get queueNode() {
		let node = document.querySelector<HTMLElement>(`#queue${this.index} > .queue-inner`);
		DefineObjectValue(this, "queueNode", node);
		return node;
	}

	clear() {
		this.splice(0, this.length);
		this.queueNode!.innerText = "";
	}

	fromString(string: string) {
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

	toString(): string {
		return Array.from(this).map(q => {
			return q[0] == "Q" ? queueToString(savedQueues[getActionValue(q[0])]) : q[0];
		}).join("");
	}
}

class SavedActionQueue extends ActionQueue {
	name: string;
	icon: string;
	colour: string;
	constructor(...items:QueueAction[]) {
		super(...items);
		this.name = "";
		this.icon = "";
		this.colour = "";
	}
}

function getActionValue(action:string){
	return +(action.match(/\d+/)?.[0] || 0);
}

function addActionToQueue(action:string){
	if (document.querySelector(".saved-queue:focus, .saved-name:focus")) return addActionToSavedQueue(action);
	for (let i = 0; i < selectedQueues.length; i++){
		zones[displayZone].queues[selectedQueues[i].clone].addActionAt(action, selectedQueues[i].pos);
		scrollQueue(selectedQueues[i].clone, selectedQueues[i].pos || undefined);
	}
	showFinalLocation();
	showCursors();
	countMultipleActions();
	return;
}

function addRuneAction(index:number, type:"rune" | "spell"){
	if (type == "rune"){
		if (index < runes.length && runes[index].canAddToQueue()) addActionToQueue("N" + index + ";");
	} else if (type == "spell") {
		if (index < spells.length && spells[index].canAddToQueue()) addActionToQueue("S" + index + ";");
	}
}

function clearQueue(queue: number | null = null, noConfirm = false){
	if (queue === null){
		if (selectedQueues.length == 0) return;
		if (selectedQueues.length == 1) {
			clearQueue(selectedQueues[0].clone, noConfirm);
		} else {
			if (selectedQueues.length == queues.length) {
				if (!noConfirm && !confirm("Really clear ALL queues?")) return;
			} else {
				if (!noConfirm && !confirm("Really clear ALL selected queues?")) return;
			}
			for (let i = 0; i < selectedQueues.length; i++) {
				clearQueue(selectedQueues[i].clone, true);
			}
		}
		return;
	}
	if (!noConfirm && !confirm("Really clear queue?")) return;
	zones[displayZone].queues[queue].clear();
	selectedQueues.forEach(q => {
		if (q.clone == queue) q.pos = null;
	});
	showCursors();
}

function createActionNode(action: string){
	if (action[0] == "Q") return createQueueActionNode(getActionValue(action));

	const actionTemplate = document.querySelector("#action-template");
	if (actionTemplate === null) throw new Error("No action template found");

	let actionNode = actionTemplate.cloneNode(true) as HTMLElement;
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
	if (!character){
		let value = getActionValue(action)!;
		character = action[0] == "N" ? runes[value].icon
				  : action[0] == "S" ? spells[value].icon
				  : action[0] == "P" ? pathfindSVG
				  : "";
	}
	actionNode.querySelector(".character")!.innerHTML = character || "";
	return actionNode;
}

function createQueueActionNode(queue: number){
	const actionTemplate = document.querySelector("#action-template");
	if (actionTemplate === null) throw new Error("No action template found");

	let actionNode = actionTemplate.cloneNode(true) as HTMLElement;
	actionNode.removeAttribute("id");
	actionNode.style.color = savedQueues[queue].colour;
	actionNode.querySelector(".character")!.innerHTML = savedQueues[queue].icon;
	actionNode.setAttribute("title", savedQueues[queue].name);
	actionNode.classList.add(`action${queue}`);
	return actionNode;
}

function resetQueueHighlight(queue: number){
	let nodes = document.querySelectorAll(`#queue${queue} .queue-inner .started`);
	nodes.forEach(n => n.classList.remove("started"));
}

function highlightCompletedActions(){
	if (!queuesNode) return;
	for (let i = 0; i < zones[displayZone].queues.length; i++){
		let queueBlock = queuesNode.children[i];
		let queueNode = queueBlock.querySelector(".queue-inner");
		if (queueNode === null) throw new Error("Queue node not found");

		let nodes = [...queueNode.children].filter(n => !n.classList.contains("action-count")) as HTMLElement[];
		for (let j = 0; j < zones[displayZone].queues[i].length; j++){
			if (zones[displayZone].queues[i][j][1]){
				nodes[j].classList.remove("started");
				nodes[j].style.backgroundSize = "0%";
			} else {
				nodes[j].classList.add("started");
				nodes[j].style.backgroundSize = "100%";
			}
		}
	}
}

function countMultipleActions(){
	if (!queuesNode) return;
	queuesNode.querySelectorAll(".action-count").forEach(node => {
		node.parentNode?.removeChild(node);
	});
	for (let i = 0; i < zones[displayZone].queues.length; i++){
		let queueBlock = queuesNode.children[i];
		let queueNode = queueBlock.querySelector(".queue-inner");
		if (queueNode === null) throw new Error("Queue node not found");
		let nodes = queueNode.children;
		let actionCount = 0;
		let countedType = null;
		for (let j = 0; j < zones[displayZone].queues[i].length + 1; j++){
			let nextType = zones[displayZone].queues[i][j]?.[0];
			if (actionCount > 3 && nextType != countedType) {
				let node = document.createElement("div");
				node.classList.add("action-count");
				node.setAttribute("data-count", actionCount.toString());
				node.style.left = `${(j - actionCount) * 16 + 2}px`;
				node.style.width = `${actionCount * 16 - 2}px`;
				if (actionCount > 9) node.classList.add("double-digit");
				queueNode.insertBefore(node, nodes[j - actionCount]);
				actionCount = 0;
				countedType = null;
			}
			if (".,I".includes(nextType) && (countedType == nextType || countedType === null)){
				actionCount++;
				countedType = nextType;
			} else {
				actionCount = 0;
				countedType = null;
			}
		}
	}
}

let actionBarWidth: number | null = null;

function selectQueueAction(queue: number, action: number, percent: number){
	let queueBlock = queuesNode.children[queue];
	let queueNode = queueBlock.querySelector(".queue-inner");
	if (queueNode === null) throw new Error("Queue node not found");
	actionBarWidth = actionBarWidth || queueNode.parentElement!.clientWidth;
	let nodes = [...queueNode.children].filter(n => !n.classList.contains("action-count")) as HTMLElement[];
	let node = nodes[action];
	if (!node && percent == 100){
		// This occurs whenever there's a zone change
		return;
	}
	node.classList.add("started");
	if (queues[queue][action][2]){
		let complete = queues[queue][action][2].findIndex((q: any) => q[`${queue}_${action}`] === undefined);
		percent /= queues[queue][action][2].length;
		percent += (complete / queues[queue][action][2].length) * 100;
	}
	node.style.backgroundSize = `${Math.max(0, percent)}%`;
	let workProgressBar = queueBlock.querySelector(".work-progress") as HTMLElement | null;
	if (workProgressBar === null) throw new Error("workProgressBar not found");
	let lastProgress = +(workProgressBar.getAttribute("lastProgress") || 0);
	if (percent < lastProgress || lastProgress == 100) {
		workProgressBar.style.width = "0%";
		lastProgress = 0;
	}
	if (percent < lastProgress + 100/(1*60)){ // 1s@60fps
		workProgressBar.style.width = percent + "%";
	} else if (lastProgress) {
		workProgressBar.style.width = "0%";
	}
	workProgressBar.setAttribute("lastProgress", percent.toString());
	// queueNode.parentNode.scrollLeft = Math.max(action * 16 - (this.width / 2), 0);
}

function clearWorkProgressBars(){
	[...(queuesNode?.querySelectorAll<HTMLElement>(".work-progress") || [])].forEach(bar => bar.style.width = "0%");
}

function scrollQueue(queue:number, action:number = zones[displayZone].queues[queue].length){
	let queueNode = document.querySelector<HTMLElement>(`#queue${queue} .queue-inner`);
	if (queueNode === null) throw new Error("Queue node not found");

	actionBarWidth = actionBarWidth || queueNode.parentElement!.clientWidth; //this should also probably not be here
	queueNode.parentElement!.scrollLeft = Math.max(action * 16 - (actionBarWidth / 2), 0);
}

function redrawQueues(){
	for (let i = 0; i < zones[displayZone].queues.length; i++){
		let queueNode = document.querySelector(`#queue${i} .queue-inner`);
		if (queueNode === null) throw new Error("Queue node not found");
		while (queueNode.lastChild) {
			queueNode.removeChild(queueNode.lastChild);
		}
		for (let action of zones[displayZone].queues[i]){
			let node = action.node;
			queueNode.append(node);
		}
	}
	highlightCompletedActions();
	countMultipleActions();
	let timelineEl = document.querySelector(`#timelines`);
	if (timelineEl === null) throw new Error("Timelines node not found");
	while (timelineEl.lastChild) {
		timelineEl.removeChild(timelineEl.lastChild);
	  }

	for (const c of clones) {
		timelineEl.append(c.timeLineElements[displayZone]);
	}
	clearWorkProgressBars();
}

function setCursor(event: MouseEvent, el: HTMLElement){
	const offsetX = event.offsetX;
	setTimeout(() => {
		let nodes = Array.from(el.parentNode?.children || []);
		let clone = parseInt(el.parentNode!.parentElement!.id.replace("queue", ""));
		let cursor = (<{
			clone: number;
			pos: number | null;
		}>selectedQueues.find(q => q.clone == clone) || selectedQueues.push({
			clone: -1,
			pos: null,
		}) && selectedQueues[selectedQueues.length - 1]);
		cursor.pos = nodes.filter(n => !n.classList.contains("action-count")).findIndex(e => e == el) - +(offsetX < 8);
		if (nodes.length - 1 == cursor.pos) cursor.pos = null;
		showCursors();
	});
}

function clearCursors(event?:Event, el?:Element){
	if (!event || event.target == el){
		selectedQueues.forEach(q => q.pos = null);
		showCursors();
	}
}

function showCursors(){
	document.querySelectorAll(".cursor.visible").forEach(el => el.classList.remove("visible"));
	selectedQueues.forEach(cursor => {
		if (cursor.pos == null) return;
		let cursorNode = document.querySelector<HTMLElement>(`#queue${cursor.clone} .cursor`);
		if (!cursorNode){
			cursor.clone = -1;
			return;
		}
		cursorNode.classList.add("visible");
		cursorNode.style.left = (cursor.pos * 16 + 17) + "px";
	});
	selectedQueues = selectedQueues.filter(cursor => cursor.clone >= 0);
	showCursorLocations();
}

function queueToString(queue:ActionQueue) {
	return queue.toString();
}

function queueToStringStripped(queue: ActionQueue) {
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
	if (!queueString) return;
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
		redrawQueues();
	}
}

function longImportQueues(queueString: string | null) {
	if (!queueString){
		queueString = prompt("Input your queues");
		if (!queueString) return;
	}
	let tempQueues = JSON.stringify(zones.map(z => z.node ? z.queues.map(queue => queueToString(queue)) : "").filter(q => q));
	try {
		let newQueues = JSON.parse(queueString);
		if (newQueues.length > zones.length || newQueues.some((q: any) => q.length > clones.length)) {
			alert("Could not import queues - too many queues.")
			return;
		}
		newQueues.forEach((q:any, i:number) => {
			zones[i].queues.map(e => e.clear());
			for (let j = 0; j < q.length; j++) {
				zones[i].queues[j].fromString(q[j]);
			}
		});
		redrawQueues();
	} catch {
		alert("Could not import queues.");
		// Clean up any issues
		longImportQueues(tempQueues);
	}
}



function DefineObjectValue(o:object, name: string | Function, value:unknown = name, enumerable = false) {
	if (typeof name == "function")
		name = name.name
	return Object.defineProperty(o, name, {
		enumerable,
		configurable: true,
		writable: true,
		value
	})
}