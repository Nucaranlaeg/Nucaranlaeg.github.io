"use strict";
class Rune {
    constructor(name, icon, isInscribable, manaCost, description, createEvent, chargeEvent, activateAction) {
        this.name = name;
        this.icon = icon;
        this.isInscribable = isInscribable;
        this.manaCost = manaCost;
        this.description = description;
        this.createEvent = createEvent;
        this.chargeEvent = chargeEvent;
        this.activateAction = activateAction;
        this.unlocked = false;
        this.upgradeCount = 0;
        this.node = null;
    }
    createNode(index) {
        if (this.node) {
            this.node.classList.remove("not-available");
            this.node.style.order = `${index}`;
            return;
        }
        let runeTemplate = document.querySelector("#rune-template");
        if (runeTemplate === null)
            throw new Error("No rune template found");
        this.node = runeTemplate.cloneNode(true);
        this.node.id = "rune_" + this.name.replace(/\W/g, "_");
        this.node.querySelector(".index").innerHTML = `${(index + 1) % 10}`;
        this.node.querySelector(".name").innerHTML = this.name;
        this.node.querySelector(".icon").innerHTML = this.icon;
        this.node.addEventListener("click", () => {
            addRuneAction(runes.indexOf(this));
        });
        document.querySelector("#runes")?.appendChild(this.node);
        let actionButtonNode = document.querySelector("#add-action-" + this.name.toLowerCase().replace(" ", "-")).parentNode;
        actionButtonNode.classList.remove("hidden-action");
        actionButtonNode.parentNode.classList.remove("hidden-action");
        this.updateDescription();
    }
    notAvailable() {
        if (this.node)
            this.node.classList.add("not-available");
    }
    canAddToQueue() {
        return !!this.node;
    }
    create(x, y) {
        if (zones[currentZone].map[y + zones[currentZone].yOffset][x + zones[currentZone].xOffset] != ".")
            return true;
        let location = getMapLocation(x, y, true);
        if (location === null)
            throw new Error("Can't create rune at location");
        if (location.baseType.name == "Mana Spring" || location.baseType.name == "Mana-infused Rock")
            return true;
        if (this.isInscribable() != CanStartReturnCode.Now) {
            return false;
        }
        location.setTemporaryPresent(this);
        setMined(x, y, this.icon);
        if (this.createEvent)
            this.createEvent(location);
        return true;
    }
    unlock() {
        this.unlocked = true;
        updateRunes();
    }
    updateDescription() {
        if (!this.node)
            return;
        let desc = this.description();
        let match = desc.match(/\{.*\}/);
        if (match) {
            let realmDesc = JSON.parse(match[0].replace(/'/g, '"'));
            desc = desc.replace(/\{.*\}/, realmDesc[currentRealm] || realmDesc[0]);
        }
        this.node.querySelector(".description").innerHTML = desc;
    }
}
function updateRunes() {
    for (let i = 0; i < runes.length; i++) {
        if (runes[i].unlocked) {
            runes[i].createNode(i);
        }
        else {
            runes[i].notAvailable();
        }
    }
}
function createChargableRune(location) {
    let action = location.getPresentAction();
    action?.start(clones[0]);
}
function weakenCreatures(location) {
    let x = location.x;
    let y = location.y;
    let locations = [getMapLocation(x - 1, y, true), getMapLocation(x + 1, y, true), getMapLocation(x, y - 1, true), getMapLocation(x, y + 1, true)];
    for (let location of locations) {
        if (location && location.creature) {
            location.creature.attack = Math.max(location.creature.attack - 1, 0);
            location.creature.defense = Math.max(location.creature.defense - 1, 0);
        }
    }
}
function canPlaceTeleport() {
    for (let y = 0; y < zones[currentZone].map.length; y++) {
        for (let x = 0; x < zones[currentZone].map[y].length; x++) {
            if (zones[currentZone].map[y][x] == "T" || zones[currentZone].map[y][x] == "t") {
                return CanStartReturnCode.Never;
            }
        }
    }
    return CanStartReturnCode.Now;
}
function getRune(name) {
    return runes.find(a => a.name == name);
}
const runes = [
    new Rune("Weaken", "W", simpleRequire([["Iron Bar", 1], ["Gold Nugget", 1]]), 0, () => `This rune weakens any orthogonally adjacent enemies,  decreasing their attack and defense by 1.<br>Requires:<br>{'0':'1 Iron Bar<br>1 Gold Nugget', '1':'2 Iron Bars<br>2 Gold Nuggets'}`, weakenCreatures, null),
    new Rune("Wither", "H", simpleRequire([["Salt", 1], ["Iron Ore", 1], ["Gold Nugget", 1]]), 0, () => `This rune allows you to kill even hardy orthogonally ${((getRune("Wither").upgradeCount || 0) > 0 ? "or diagonally " : "")}adjacent plants.  Interact with it to charge it up - it takes ${((getRune("Wither").upgradeCount || 0) > 1 ? "1/" + 2 ** (getRune("Wither").upgradeCount - 1) : "")} as much Temporal to charge as the plants you're trying to kill would take to chop.<br>Requires:<br>{'0':'1 Salt<br>1 Iron Ore${getRealm("Verdant Realm").completed || getRealm("Verdant Realm").maxMult > 1e307 ? "" : "<br>1 Gold Nugget"}', '1':'2 Salt<br>2 Iron Ore${getRealm("Verdant Realm").completed ? "" : "<br>2 Gold Nuggets"}'}`, null, null, "Charge Wither"),
    new Rune("Duplication", "D", () => CanStartReturnCode.Now, 1000, () => `Mine more resources with this rune.  After placing it,  interact with it to charge it up.  You'll receive +${(1 + (getRune("Duplication").upgradeCount || 0) * 0.25)} of each (orthogonally or diagonally) adjacent resource (when mined), though each rune placed in a zone costs twice as much to charge as the last.`, createChargableRune, null, "Charge Duplication"),
    new Rune("Teleport To", "T", canPlaceTeleport, 0, () => `This rune allows someone or something to come through from another place.  Only one can be placed,  and it must be charged after placement.  Use a pathfind action right after teleporting to fix the path prediction.`, null, null, "Charge Teleport"),
    new Rune("Teleport From", "F", simpleRequire([["Iron Ore", 2]]), 1000, () => `This rune allows someone to slip beyond to another place.  Interact with it after inscribing it to activate it.<br>Requires:<br>{'0':'2 Iron Ore', '1':'4 Iron Ore'}`, null, null, "Teleport"),
    new Rune("Pump", "P", simpleRequire([["Iron Bar", 3], ["Steel Bar", 1]]), 0, () => `This rune drains water from surrounding spaces.  It drains log_2(Runic Lore) / 25 water per second from its space and a quarter that from the 4 adjacent spaces.<br>Requires:<br>{'0':'3 Iron Bars<br>1 Steel Bar', '1':'6 Iron Bars<br>2 Steel Bars'}`, null, null, "Pump"),
];
//# sourceMappingURL=runes.js.map