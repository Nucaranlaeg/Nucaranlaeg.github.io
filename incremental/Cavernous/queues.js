let queues = [];
let selectedQueue = [];
let savedQueues = [];
let cursor = [0, null];

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
	let queueNode = document.querySelector(`#queue${queue} .queue-inner`);
	if (cursor[1] == null){
		if (action == "B") {
			if (queues[queue].length == 0) return;
			queues[queue].pop();
			queueNode.removeChild(queueNode.lastChild);
		} else if ("UDLRI<=".includes(action) || (action[0] == "N" && !isNaN(+action[1]))) {
			queues[queue].push([action, true]);
			queueNode.append(createActionNode(action));
		}
		scrollQueue(queue, queues[queue].length);
	} else {
		if (action == "B") {
			if (queues[queue].length == 0 || cursor[1] == -1) return;
			queues[queue].splice(cursor[1], 1);
			cursor[1]--;
		} else if ("UDLRI<=".includes(action) || (action[0] == "N" && !isNaN(+action[1]))) {
			if (cursor[1] >= 0){
				queues[queue].splice(cursor[1] + 1, 0, [action, queues[queue][cursor[1]][1]]);
			} else {
				queues[queue].unshift([action, queues[0][1]])
			}
			cursor[1]++;
		} else {
			// Avoid expensive draws if it somehow got here.
			return;
		}
		redrawQueues();
		scrollQueue(queue, cursor[1]);
		showCursor();
	}
}

function clearQueue(queue = null){
	if (queue === null){
		for (let i = 0; i < selectedQueue.length; i++){
			clearQueue(selectedQueue[i]);
		}
		return;
	}
	if (!confirm("Really clear queue?")) return;
	queues[queue] = [];
	if (cursor[0] == queue){
		cursor[1] = null;
	}
	let queueNode = document.querySelector(`#queue${queue} .queue-inner`);
	while (queueNode.firstChild) {
		queueNode.removeChild(queueNode.lastChild);
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
		character = runes[action[1]].icon;
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
	let queueNode = document.querySelector(`#queue${queue} .queue-inner`);
	this.width = this.width || queueNode.parentNode.clientWidth;
	let nodes = queueNode.querySelectorAll(`.action`);
	let node = nodes[action];
	node.classList.add("started");
	if (queues[queue][action][2]){
		let complete = queues[queue][action][2].findIndex(q => q[`${queue}_${action}`] === undefined);
		percent /= queues[queue][action][2].length;
		percent += (complete / queues[queue][action][2].length) * 100;
	}
	node.querySelector(".progress").style.width = percent + "%";
	let workProgressBar = node.closest('.bottom-block').querySelector('.work-progress');
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
		for (let j = 0; j < queues[i].length; j++){
			let node = createActionNode(queues[i][j][0]);
			queueNode.append(node);
			if (!queues[i][j][1]){
				node.classList.add("started");
				node.querySelector(".progress").style.width = "100%";
			}
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
