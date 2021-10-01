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
			this.node.style.order = index;
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
		getStat("Runic Lore").gainSkill(this.isInscribable.itemCount || 0);
		return true;
	}

	unlock(){
		this.unlocked = true;
		updateRunes();
	}
}

function updateRunes(){
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
	this.itemCount = 0;
	for (let y = 0; y < zones[currentZone].map.length; y++){
		for (let x = 0; x < zones[currentZone].map[y].length; x++){
			if (zones[currentZone].map[y][x] == "T" || zones[currentZone].map[y][x] == "t"){
				return false;
			}
		}
	}
	return true;
}

function getRune(name){
	return runes.find(a => a.name == name);
}

let runes = [
	new Rune("Weaken", "W", simpleRequire([["Iron Bar", 1], ["Gold Nugget", 1]]), 0, "This rune weakens any orthogonally adjacent enemies, decreasing their attack and defense by 1.<br>Requires:<br>1 Iron Bar<br>1 Gold Nugget", weakenCreatures),
	new Rune("Wither", "H", simpleRequire([["Salt", 1], ["Iron Ore", 1], ["Gold Nugget", 1]]), 0, "This rune allows you to kill even hardy plants.  Interact with it to charge it up - it takes as much time to charge as the plants you're trying to kill would take to chop.<br>Requires:<br>1 Salt<br>1 Iron Ore<br>1 Gold Nugget", null, "Charge Wither"),
	new Rune("Duplication", "D", () => true, 1000, "Mine more resources with this rune.  After placing it, interact with it to charge it up.  You'll receive +1 of each (orthogonally or diagonally) adjacent resource (when mined), though each rune placed in a zone makes it harder to charge others.", null, "Charge Duplication"),
	new Rune("Teleport To", "T", canPlaceTeleport, 0, "This rune allows someone or something to come through from another place.  Only one can be placed.", null, "Charge Teleport"),
	new Rune("Teleport From", "F", simpleRequire([["Iron Ore", 2]]), 1000, "This rune allows someone to slip beyond to another place.  Interact with it after inscribing it to activate it.<br>Requires:<br>2 Iron Ore", null, "Teleport"),
];
