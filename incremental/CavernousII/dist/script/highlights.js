"use strict";
let finalLocation = null;
let hoverLocation = null;
function showIntermediateLocation(event) {
    let queueNode = event.target.parentElement.parentElement;
    let index = Array.from(queueNode.children)
        .filter(n => !n.classList.contains("action-count"))
        .findIndex(node => node == event.target.parentElement);
    let queueNumber = +queueNode.parentElement.id.replace("queue", "");
    if (isNaN(+queueNumber)) {
        return;
    }
    showLocationAfterSteps(index, queueNumber, false, true);
}
function showLocationAfterSteps(index, queueNumber, isDraw = false, isHover = false) {
    if (index == -1)
        return;
    let x = zones[displayZone].xOffset, y = zones[displayZone].yOffset;
    [x, y] = getQueueOffset(x, y, zones[displayZone].queues[queueNumber], index);
    if (x === undefined || y === undefined)
        return;
    let target = getMapNode(x, y);
    if (!target)
        return;
    if (isHover) {
        hoverLocation && hoverLocation.classList.remove("hover-location");
        target.classList.add("hover-location");
        hoverLocation = target;
    }
    else {
        finalLocation && finalLocation.classList.remove("final-location");
        target.classList.add("final-location");
        finalLocation = target;
    }
    if (!isDraw)
        viewCell(target);
}
function getQueueOffset(x, y, queue, maxIndex = -1) {
    for (let i = 0; i <= maxIndex; i++) {
        if (!queue || !queue[i] || x === undefined || y === undefined) {
            return [undefined, undefined];
        }
        let action = queue[i][0];
        if (action[0] == "Q") {
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
function getActionOffset(x, y, action) {
    if (action[0] == "P") {
        let _;
        const match = action.match(/P(-?\d+):(-?\d+);/);
        if (match === null)
            throw new Error(`Invalid action string "${action}"`);
        [_, x, y] = match.map(parseInt);
        return [+x + zones[displayZone].xOffset, +y + zones[displayZone].yOffset];
    }
    x += +(action == "R") - +(action == "L");
    y += +(action == "D") - +(action == "U");
    if (getMapTile(x, y) == "█") {
        x -= +(action == "R") - +(action == "L");
        y -= +(action == "D") - +(action == "U");
    }
    return [x, y];
}
function stopHovering() {
    hoverLocation && hoverLocation.classList.remove("hover-location");
    hoverLocation = null;
}
function showFinalLocation(isDraw = false) {
    if (selectedQueue[0] !== undefined) {
        showLocationAfterSteps(zones[displayZone].queues[selectedQueue[0]].length - 1, selectedQueue[0], isDraw);
    }
    else if (finalLocation) {
        finalLocation.classList.remove("final-location");
    }
}
//# sourceMappingURL=highlights.js.map