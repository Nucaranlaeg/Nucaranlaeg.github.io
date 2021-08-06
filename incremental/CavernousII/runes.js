class Rune {
	constructor(name, icon, isInscribable, manaCost, description, createEvent, activateAction){
		this.name = name;
		this.icon = icon;
		this.isInscribable = isInscribable;
		this.manaCost = manaCost;
		this.description = description;
		this.createEvent = createEvent;
		this.activateAction = activateAction;
		this.unlocked = false;
	}

	createNode(index) {
		if (this.node){
			this.node.classList.remove("not-available");
			return;
		}
		let runeTemplate = document.querySelector("#rune-template");
		this.node = runeTemplate.cloneNode(true);
		this.node.id = "rune_" + this.name.replace(/\W/g, '_');
		this.node.querySelector(".index").innerHTML = (index + 1) % 10;
		this.node.querySelector(".name").innerHTML = this.name;
		this.node.querySelector(".icon").innerHTML = this.icon;
		this.node.querySelector(".description").innerHTML = this.description;
		this.node.setAttribute("onclick", `addRuneAction(${runes.indexOf(this)}, "rune")`);
		document.querySelector("#runes").appendChild(this.node);
		let actionButtonNode = document.querySelector("#add-action-" + this.name.toLowerCase().replace(" ", "-")).parentNode;
		actionButtonNode.classList.remove("hidden-action");
		actionButtonNode.parentNode.classList.remove("hidden-action");
	}

	notAvailable() {
		if (this.node) this.node.classList.add("not-available");
	}

	canAddToQueue() {
		return !!this.node;
	}

	create(x, y){
		if (zones[currentZone].map[y + zones[currentZone].yOffset][x + zones[currentZone].xOffset] != ".") return true;
		if (this.isInscribable() > 0){
			this.isInscribable(true);
		} else {
			return false;
		}
		let location = getMapLocation(x, y);
		location.setTemporaryPresent(this);
		setMined(x, y, this.icon);
		if (this.createEvent) this.createEvent(x, y);
		return true;
	}

	unlock(){
		this.unlocked = true;
	}
}

function updateRunes(current){
	if (current > 5){
		getMessage("Runic Lore").display();
	}
	for (let i = 0; i < runes.length; i++){
		if (runes[i].unlocked){
			runes[i].createNode(i);
		} else {
			runes[i].notAvailable();
		}
	}
}

function weakenCreatures(x, y){
	let locations = [
		getMapLocation(x-1, y, true),
		getMapLocation(x+1, y, true),
		getMapLocation(x, y-1, true),
		getMapLocation(x, y+1, true),
	];
	for (let i = 0; i < locations.length; i++){
		if (locations[i].creature){
			locations[i].creature.attack = Math.max(locations[i].creature.attack - 1, 0);
			locations[i].creature.defense = Math.max(locations[i].creature.defense - 1, 0);
		}
	}
}

function canPlaceTeleport(){
	if (startTeleport() > 0) return false;
	return simpleRequire([["Iron Bar", 1], ["Gold Nugget", 1]])();
}

function getRune(name){
	return runes.find(a => a.name == name);
}

let runes = [
	new Rune("Weaken", "W", simpleRequire([["Iron Bar", 1], ["Gold Nugget", 1]]), 0, "This rune weakens any orthogonally adjacent enemies, decreasing their attack and defense by 1.<br>Requires:<br>1 Iron Bar<br>1 Gold Nugget", weakenCreatures),
	new Rune("Teleport To", "T", canPlaceTeleport, 0, "This rune allows someone or something to come through from another place.  Only one can be placed.<br>Requires:<br>1 Iron Bar<br>1 Gold Nugget"),
	new Rune("Teleport From", "F", simpleRequire([["Iron Ore", 2]]), 1000, "This rune allows someone to slip beyond to another place.  Interact with it after inscribing it to activate it.<br>Requires:<br>2 Iron Ore", null, "Teleport"),
	new Rune("Duplication", "D", () => true, 1000, "Mine more resources with this rune.  After placing it, interact with it to charge it up.  You'll receive +1 of each orthogonally adjacent resource (when mined), though each rune placed makes it harder to charge others.", null, "Charge Duplication"),
];
