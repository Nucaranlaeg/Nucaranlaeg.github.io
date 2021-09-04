let finalLocation;
let hoverLocation;

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
	let x = zones[displayZone].xOffset; y = zones[displayZone].yOffset;
	[x, y] = getQueueOffset(x, y, zones[displayZone].queues[queueNumber], index);
	if (x === undefined) return;
	let target = getMapNode(x, y);
	if (!target) return;
	if (isHover) {
		hoverLocation && hoverLocation.classList.remove('hover-location');
		target.classList.add('hover-location');
		hoverLocation = target;
	}
	else {
		finalLocation && finalLocation.classList.remove('final-location');
		target.classList.add('final-location');
		finalLocation = target;
	}
	if (!isDraw) viewCell({"target": target});
}

function getQueueOffset(x, y, queue, maxIndex){
	for (let i = 0; i <= maxIndex; i++){
		if (!queue || !queue[i]) {
			return [undefined, undefined];
		}
		let action = queue[i][0];
		if (action[0] == "Q"){
			[x, y] = getQueueOffset(x, y, savedQueues[getActionValue(action)], savedQueues[getActionValue(action)].length - 1);
			continue;
		}
		[x, y] = getActionOffset(x, y, action);
		if (!zones[displayZone].hasMapLocation(x, y)) {
			return [undefined, undefined];
		}
	}
	return [x, y];
}

function getQueueOffsets(x, y, queue){
	let positions = [];
	for (let i = 0; i < queue.length; i++){
		let action = queue[i][0];
		if (action[0] == "Q"){
			positions.push(...getQueueOffset(x, y, savedQueues[getActionValue(action)]));
			[x, y] = positions[positions.length - 1];
			if (x === undefined) return positions;
			continue;
		}
		[x, y] = getActionOffset(x, y, action);
		if (!zones[displayZone].hasMapLocation(x, y)) {
			positions.push([undefined, undefined]);
			return positions;
		}
		positions.push([x, y]);
	}
	return positions;
}

function getActionOffset(x, y, action){
	if (action[0] == "P"){
		let _;
		[_, x, y] = action.match(/P(-?\d+):(-?\d+);/);
		return [+x + zones[displayZone].xOffset, +y + zones[displayZone].yOffset];
	}
	x += (action == "R") - (action == "L");
	y += (action == "D") - (action == "U");
	if (getMapTile(x, y) == "█"){
		x -= (action == "R") - (action == "L");
		y -= (action == "D") - (action == "U");
	}
	return [x, y];
}

function stopHovering(){
	hoverLocation && hoverLocation.classList.remove("hover-location");
	hoverLocation = undefined;
}

function showFinalLocation(isDraw = false){
	if (selectedQueue[0] !== undefined){
		showLocationAfterSteps(zones[displayZone].queues[selectedQueue[0]].length - 1, selectedQueue[0], isDraw);
	} else if (finalLocation) {
		finalLocation.classList.remove("final-location");
	}
}
