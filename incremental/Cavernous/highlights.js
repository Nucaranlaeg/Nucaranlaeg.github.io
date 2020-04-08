function showIntermediateLocation(e){
	let queueNode = e.target.parentNode.parentNode;
	let index = Array.from(queueNode.children).findIndex(node => node == e.target.parentNode);
	let queueNumber = queueNode.parentNode.id.replace("queue", "");
	if (isNaN(+queueNumber)){
		return;
	}
	showLocationAfterSteps(index, queueNumber, false, true);
}

function showLocationAfterSteps(index, queueNumber, isDraw = false, isHover = false){
	if (index == -1) return;
	let x = xOffset; y = yOffset;
	[x, y] = getQueueOffset(x, y, queues[queueNumber], index);
	if (x === undefined) return;
	let target = document.querySelector(`#map-inner`);
	if (!target) return;
	target = target.children[y];
	if (!target) return;
	target = target.children[x];
	document.querySelectorAll(`.${isHover ? 'hover' : 'final'}-location`).forEach(e => e.classList.remove(`${isHover ? 'hover' : 'final'}-location`));
	target.classList.add(`${isHover ? 'hover' : 'final'}-location`);
	if (!isDraw) viewCell({"target": target});
}

function getQueueOffset(x, y, queue, maxIndex){
	for (let i = 0; i <= maxIndex; i++){
		let action = queue[i][0];
		if (!isNaN(+action)){
			[x, y] = getQueueOffset(x, y, savedQueues[action], savedQueues[action].length - 1);
			continue;
		}
		[x, y] = getActionOffset(x, y, action);
		if (!mapLocations[y] || !mapLocations[y][x]) {
			return [undefined, undefined];
		}
	}
	return [x, y];
}

function getActionOffset(x, y, action){
	x += (action == "R") - (action == "L");
	y += (action == "D") - (action == "U");
	if (map[y][x] == "█"){
		x -= (action == "R") - (action == "L");
		y -= (action == "D") - (action == "U");
	}
	return [x, y];
}

function stopHovering(){
	document.querySelectorAll(".hover-location").forEach(e => e.classList.remove("hover-location"));
}

function showFinalLocation(isDraw = false){
	document.querySelectorAll(".final-location").forEach(e => e.classList.remove("final-location"));
	if (selectedQueue[0] !== undefined){
		showLocationAfterSteps(queues[selectedQueue[0]].length - 1, selectedQueue[0], isDraw);
	}
}
