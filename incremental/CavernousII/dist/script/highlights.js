"use strict";
let finalLocations = [];
let cursorLocations = [];
let hoverLocation = null;
const HIGHLIGHT_TYPES = {
    FINAL: 0,
    HOVER: 1,
    CURSOR: 2,
};
function showLocationAfterSteps(index, queueNumber, isDraw = false, highlightType = HIGHLIGHT_TYPES.FINAL) {
    if (index == -1)
        return;
    let x = zones[displayZone].xOffset, y = zones[displayZone].yOffset;
    [x, y] = getQueueOffset(x, y, zones[displayZone].queues[queueNumber], index);
    if (x === undefined || y === undefined)
        return;
    let target = getMapNode(x, y);
    if (!target)
        return;
    if (highlightType == HIGHLIGHT_TYPES.HOVER) {
        hoverLocation && hoverLocation.classList.remove("hover-location");
        target.classList.add("hover-location");
        hoverLocation = target;
    }
    else if (highlightType == HIGHLIGHT_TYPES.CURSOR) {
        target.classList.add("cursor-location");
        cursorLocations.push(target);
    }
    else {
        target.classList.add("final-location");
        finalLocations.push(target);
    }
    if (!isDraw)
        viewCell(target);
}
function getQueueOffset(x, y, queue, maxIndex = -1) {
    for (let i = 0; i <= maxIndex; i++) {
        if (!queue || !queue[i] || x === undefined || y === undefined) {
            return [undefined, undefined];
        }
        let action = queue[i].actionID;
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
        [_, x, y] = match.map(z => +z);
        return [x + zones[displayZone].xOffset, y + zones[displayZone].yOffset];
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
    finalLocations.forEach(f => f.classList.remove("final-location"));
    finalLocations = [];
    zones[displayZone].queues.forEach(q => {
        if (!q.selected)
            return;
        showLocationAfterSteps(q.cursor || q.length - 1, q.index, isDraw);
    });
}
function showIntermediateLocation(event) {
    let queueNode = event.target.parentElement.parentElement;
    let index = Array.from(queueNode.children)
        .filter(n => !n.classList.contains("action-count"))
        .findIndex(node => node == event.target.parentElement);
    let queueNumber = +queueNode.parentElement.id.replace("queue", "");
    if (isNaN(+queueNumber)) {
        return;
    }
    showLocationAfterSteps(index, queueNumber, false, HIGHLIGHT_TYPES.HOVER);
}
function showCursorLocations() {
    cursorLocations.forEach(f => f.classList.remove("cursor-location"));
    zones[displayZone].queues.forEach(queue => {
        if (queue.cursor === null)
            return;
        showLocationAfterSteps(queue.cursor, queue.index, false, HIGHLIGHT_TYPES.CURSOR);
    });
}
//# sourceMappingURL=highlights.js.map