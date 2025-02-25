"use strict";
const classMapping = {
    "█": ["wall", "Solid Rock"],
    "¤": [
        "mana",
        "Mana-infused Rock",
        true,
        (d, x, y) => `${d} ${zones[displayZone].mapLocations[y][x].type.nextCost(zones[displayZone].mapLocations[y][x].completions, zones[displayZone].mapLocations[y][x].priorCompletions, zones[displayZone], x - zones[displayZone].xOffset, y - zones[displayZone].yOffset)}`
    ],
    "*": [
        "mined-mana",
        "Mana Spring",
        true,
        (d, x, y) => `${d} ${zones[displayZone].mapLocations[y][x].type.nextCost(zones[displayZone].mapLocations[y][x].completions, zones[displayZone].mapLocations[y][x].priorCompletions, zones[displayZone], x - zones[displayZone].xOffset, y - zones[displayZone].yOffset)}`
    ],
    ".": ["tunnel", "Dug Tunnel"],
    "#": ["limestone", "Limestone"],
    "«": ["travertine", "Travertine"],
    "╖": ["granite", "Granite"],
    "╣": ["basalt", "Basalt"],
    "■": ["chert", "Chert"],
    "♥": ["clone-machine", "Strange Machine"],
    "+": ["gold", "Gold Ore"],
    "%": ["iron", "Iron Ore"],
    "░": ["salt", "Salt"],
    "╬": ["furnace", "Furnace"],
    "▣": ["furnace2", "Steel Furnace"],
    "=": ["vaporizer", "Vaporizer"],
    "⎶": ["bridge", "Anvil - Bridge"],
    "&": ["bridge2", "Anvil - Upgrade Bridge"],
    "║": ["bridge3", "Anvil - Long Bridge"],
    " ": ["pit", "Bottomless Pit"],
    "~": ["lava", "Bottomless Lava"],
    '"': ["book", "Book"],
    ")": ["sword", "Anvil - Sword"],
    "[": ["shield", "Anvil - Shield"],
    "]": ["armour", "Anvil - Armour"],
    "(": ["sword2", "Anvil - Upgrade Sword"],
    "{": ["shield2", "Anvil - Upgrade Shield"],
    "}": ["armour2", "Anvil - Upgrade Armour"],
    "^": ["fountain", "Fountain"],
    "W": ["rune-weak", "Weaken Rune"],
    "H": ["rune-wither", "Wither Rune"],
    "T": ["rune-to", "Teleport To Rune"],
    "t": ["rune-to-charged", "Teleport To Rune"],
    "F": ["rune-from", "Teleport From Rune"],
    "D": ["rune-dup", "Duplication Rune"],
    "d": ["rune-dup-charged", "Duplication Rune"],
    "P": ["rune-pump", "Pump Rune"],
    "○": ["coal", "Coal"],
    "☼": ["gem", "Gem"],
    "©": ["mined-gem", "Gem Tunnel"],
    "g": ["goblin", "Goblin"],
    "c": ["chieftain", "Goblin Chieftain"],
    "s": ["skeleton", "Skeleton"],
    "m": ["champion", "Goblin Champion"],
    "G": ["golem", "Golem"],
    "X": ["guardian", "Guardian"],
    "Θ": ["zone", "Zone Portal"],
    "√": ["goal", "Goal"],
    "♠": ["mushroom", "Mushroom"],
    "♣": ["kudzushroom", "Kudzushroom"],
    "α": ["sporeshroom", "Sporeshroom"],
    "§": ["oystershroom", "Oystershroom"],
    "δ": ["springshroom", "Springshroom"],
    "¢": ["axe", "Anvil - Axe"],
    "¥": ["pick", "Anvil - Pick"],
    "£": ["hammer", "Anvil - Hammer"],
    "0": ["spring", "Spring"],
    "|": ["sword3", "Enchanter - Sword"],
    "<": ["shield3", "Enchanter - Shield"],
    ">": ["armour3", "Enchanter - Armour"],
    "1": ["barrier", "Timelike Barrier"],
    "2": ["barrier", "Timelike Barrier"],
    "3": ["barrier", "Timelike Barrier"],
    "!": ["exit", "Exit"],
};
const MAX_WATER = 11;
setTimeout(() => {
    Object.entries(classMapping).forEach(e => {
        try {
            let type = getLocationTypeBySymbol(e[0]);
            if (type)
                e[1][1] = type;
        }
        catch { }
    });
});
// The tiles that can be pathfinded through.
const walkable = '*.♥╬▣=⎶&║"()[]{}^WHTtFDdP¢¥£©Θ|<>';
// Water can flow through shrooms, albeit slower.
const shrooms = "♠♣α§δ";
const runesTiles = "WHTtDdF";
let mapDirt = [];
let mapStain = [];
let visibleX = null, visibleY = null;
// Not a view function; consider moving.
function getMapLocation(x, y, noView = false, zone = null) {
    if (zone !== null) {
        return zones[zone].getMapLocation(x, y, noView);
    }
    return zones[currentZone].getMapLocation(x, y, noView);
}
const mapNode = (() => {
    let node = document.querySelector("#map-inner");
    if (node === null)
        throw new Error("No map node");
    return node;
})();
let mapNodes = [];
function drawNewMap() {
    mapNodes = [];
    while (mapNode.firstChild) {
        mapNode.removeChild(mapNode.lastChild);
    }
    let rowTemplate = document.querySelector("#row-template");
    if (rowTemplate === null)
        throw new Error("No row template");
    let cellTemplate = document.querySelector("#cell-template");
    if (cellTemplate === null)
        throw new Error("No cell template");
    for (let y = 0; y < zones[displayZone].map.length; y++) {
        mapNodes[y] = [];
        let rowNode = rowTemplate.cloneNode(true);
        rowNode.removeAttribute("id");
        mapNode.append(rowNode);
        if (zones[displayZone].mapLocations[y]) {
            for (let x = 0; x < zones[displayZone].map[y].length; x++) {
                let cellNode = cellTemplate.cloneNode(true);
                cellNode.removeAttribute("id");
                cellNode.setAttribute("data-x", x.toString());
                cellNode.setAttribute("data-y", y.toString());
                cellNode.onmouseenter = () => showRelevantStats(zones[displayZone].mapLocations[y][x]);
                if (zones[displayZone].mapLocations[y][x]) {
                    let [className, descriptor, isStained, descriptorMod] = classMapping[zones[displayZone].map[y][x]];
                    let classNames = className.split(" ");
                    for (let i = 0; i < classNames.length; i++) {
                        cellNode.classList.add(classNames[i]);
                    }
                    cellNode.setAttribute("data-content", descriptorMod ? descriptorMod(descriptor, x, y) : descriptor);
                    if (zones[displayZone].mapLocations[y][x].water > 0.1) {
                        cellNode.classList.add(`watery-${Math.min(Math.floor(zones[displayZone].mapLocations[y][x].water * 10), MAX_WATER)}`);
                    }
                }
                else {
                    cellNode.classList.add("blank");
                }
                rowNode.append(cellNode);
                mapNodes[y][x] = cellNode;
            }
        }
    }
    isDrawn = true;
    displayClones();
    mapStain = [];
}
let isDrawn = false;
function drawCell(x, y) {
    let cell = (mapNodes[y] || [])[x];
    if (!cell)
        return;
    let location = zones[displayZone].mapLocations[y][x];
    if (!location)
        return;
    let [className, descriptor, isStained, descriptorMod] = classMapping[zones[displayZone].map[y][x]];
    cell.className = className;
    if (location.water > 0.1) {
        cell.classList.add(`watery-${Math.min(Math.floor(zones[displayZone].mapLocations[y][x].water * 10), MAX_WATER)}`);
    }
    cell.setAttribute("data-content", descriptorMod ? descriptorMod(descriptor, x, y) : descriptor);
}
function drawMap() {
    if (!isDrawn)
        drawNewMap();
    if (currentZone == displayZone) {
        mapDirt.forEach(([x, y]) => drawCell(x, y));
        mapDirt = [];
        mapStain.forEach(([x, y]) => drawCell(x, y));
    }
    clampMap();
    displayClones();
    showFinalLocation(true);
}
function displayClones() {
    if (currentZone == displayZone) {
        for (let i = 0; i < clones.length; i++) {
            let clone = clones[i];
            clone.occupiedNode && clone.occupiedNode.classList.remove("occupied");
            let node = mapNodes[clone.y + zones[displayZone].yOffset][clone.x + zones[displayZone].xOffset];
            node.classList.add("occupied");
            clone.occupiedNode = node;
        }
    }
}
function clampMap() {
    let xMin = 999;
    let xMax = -999;
    let yMin = 999;
    let yMax = -999;
    for (let y = 0; y < zones[displayZone].mapLocations.length; y++) {
        for (let x = 0; x < zones[displayZone].mapLocations[y].length; x++) {
            if (zones[displayZone].mapLocations[y][x]) {
                xMin = Math.min(xMin, x);
                xMax = Math.max(xMax, x);
                yMin = Math.min(yMin, y);
                yMax = Math.max(yMax, y);
            }
        }
    }
    for (let y = 0; y < mapNodes.length; y++) {
        for (let x = 0; x < mapNodes[y].length; x++) {
            let node = mapNodes[y][x];
            let toHide = xMin > x || x > xMax || yMin > y || y > yMax;
            if (node.hidden != toHide) {
                node.hidden = toHide;
            }
        }
    }
    let size = Math.max(xMax - xMin + 1, yMax - yMin + 1);
    let scale = Math.floor(440 / size);
    mapNode.style.setProperty("--cell-count", size + "px");
    mapNode.style.setProperty("--cell-size", scale + "px");
}
function setMined(x, y, icon) {
    const minedMapping = {
        "¤": "*",
        "☼": "©",
        "#": ".",
        "♠": ".",
        "α": ".",
        "«": ".",
        "+": ".",
        "%": ".",
        " ": ".",
        "g": ".",
        "G": ".",
        "X": ".",
        "○": ".",
        "c": ".",
        "§": ".",
        "δ": ".",
        "s": ".",
        "m": ".",
        "√": ".",
        "░": ".",
        "╖": ".",
        "╣": ".",
        "■": ".",
        "1": ".",
        "2": ".",
        "3": ".",
    };
    x += zones[currentZone].xOffset;
    y += zones[currentZone].yOffset;
    let old = zones[currentZone].map[y][x];
    let tile = icon ||
        minedMapping[old] ||
        old;
    zones[currentZone].map[y] = zones[currentZone].map[y].slice(0, x) + tile + zones[currentZone].map[y].slice(x + 1);
    if (tile !== old) {
        mapDirt.push([x, y]);
    }
    if (tile == "*")
        getMessage("Mana Extraction").display();
}
function viewCell(target) {
    let x = parseInt(target.dataset.x ?? "-1"), y = parseInt(target.dataset.y ?? "-1");
    mapNode?.querySelector(".selected-map-cell")?.classList.remove("selected-map-cell");
    target.classList.add("selected-map-cell");
    let type = [...target.classList].find(x => x !== "occupied" && x !== "final-location");
    if (zones[displayZone].mapLocations[y] && zones[displayZone].mapLocations[y][x]) {
        let location = zones[displayZone].mapLocations[y][x];
        for (let classMappingEntry of Object.entries(classMapping)) {
            if (classMappingEntry[1][0] == type) {
                let type = getLocationType(getLocationTypeBySymbol(classMappingEntry[0]) || "");
                if (type === undefined) {
                    console.warn(new Error("Failed to get location type"));
                    continue;
                }
                let primaryAction = type.presentAction || location.temporaryPresent || type.enterAction;
                document.querySelector("#location-name").innerHTML =
                    type.name + (type.name == "Mana-infused Rock" || type.name == "Mana Spring" ? ` (${location.priorCompletions})` : "");
                let description = type.description;
                if (description.includes("{STATS}")) {
                    let statsDesc = `Attack: ${location.creature?.attack}\nDefense: ${location.creature?.defense}\nHealth: ${location.creature?.health}`;
                    description = description.replace("{STATS}", statsDesc);
                }
                if (description.includes("{MANA_PER_GOLD}")) {
                    description = description.replace("{MANA_PER_GOLD}", writeNumber(GOLD_VALUE * getRealmMult("Verdant Realm", true), 4));
                }
                let match = description.match(/\{.*\}/);
                if (match) {
                    let realmDesc = JSON.parse(match[0].replace(/'/g, '"').replace(/""/g, "'"));
                    description = description.replace(/\{.*\}/, realmDesc[currentRealm] || realmDesc[0] || "");
                }
                document.querySelector("#location-description").innerHTML = description.replace(/\n/g, "<br>");
                if (type.nextCost) {
                    document.querySelector("#location-next").innerHTML = `Next: ${type.nextCost(location.completions, location.priorCompletions, location.zone, x - zones[displayZone].xOffset, y - zones[displayZone].yOffset)}`;
                }
                else if (primaryAction) {
                    let baseTimeDisplay = primaryAction.getProjectedDuration(location, location.wither);
                    document.querySelector("#location-next").innerHTML = `Time: ${writeNumber(baseTimeDisplay / 1000, 2)}s`;
                }
                else {
                    document.querySelector("#location-next").innerHTML = "";
                }
                if (location.water) {
                    document.querySelector("#location-water").innerHTML = `Water level: ${writeNumber(location.water, 2)}`;
                }
                else {
                    document.querySelector("#location-water").innerHTML = "";
                }
                visibleX = x - zones[displayZone].xOffset;
                visibleY = y - zones[displayZone].yOffset;
                if (type.name == "Mana-infused Rock" || type.name == "Mana Spring") {
                    document.querySelector("#location-route").hidden = true;
                    let route = getBestRoute(visibleX, visibleY, displayZone);
                    if (route) {
                        route.showOnLocationUI();
                    }
                    else {
                        document.querySelector("#route-has-route").hidden = true;
                        document.querySelector("#route-not-visited").hidden = true;
                    }
                }
                else {
                    document.querySelector("#location-route").hidden = true;
                }
                return;
            }
        }
    }
}
function getMapNode(x, y) {
    return mapNodes[y] && mapNodes[y][x];
}
function getOffsetMapNode(x, y) {
    return getMapNode(x + zones[displayZone].xOffset, y + zones[displayZone].yOffset);
}
function getMapTile(x, y) {
    return zones[displayZone].map[y] && zones[displayZone].map[y][x];
}
function getOffsetCurrentMapTile(x, y) {
    return zones[currentZone].map[y + zones[currentZone].yOffset] && zones[currentZone].map[y + zones[currentZone].yOffset][x + zones[currentZone].xOffset];
}
function displayCreatureHealth(creature) {
    if (currentZone != displayZone)
        return;
    let node = getOffsetMapNode(creature.x, creature.y);
    if (!node)
        return;
    if (creature.health > 0 && creature.health < creature.creature.health) {
        node.innerHTML = `<div class="enemy-hp" style="width:${Math.floor((creature.health / creature.creature.health) * 100)}%"></div>`;
    }
    else {
        node.innerHTML = "";
    }
}
function showRelevantStats(loc) {
    if (!loc)
        return;
    let action;
    if (realms[currentRealm].name == "Verdant Realm") {
        if (verdantMapping[loc.baseType.symbol]) {
            let locType = getLocationTypeBySymbol(verdantMapping[loc.baseType.symbol]);
            if (locType) {
                action = getLocationType(locType)?.getEnterAction(loc.entered);
            }
        }
    }
    if (!action) {
        let enterAction = loc.baseType.getEnterAction(loc.entered);
        action = enterAction?.name == "Walk" ? loc.baseType.presentAction || loc.temporaryPresent || enterAction : enterAction;
    }
    document.querySelectorAll(".relevant-stat").forEach(node => node.classList.remove("relevant-stat"));
    if (action) {
        action.stats.forEach(s => {
            document.querySelector(`#stat_${s[0].name.replace(" ", "-")}`)?.classList.add("relevant-stat");
        });
    }
}
//# sourceMappingURL=map.js.map