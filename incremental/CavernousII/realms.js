let currentRealm = 0;

class Realm {
	constructor(name, description, getMachineCount, activateMachine, extraDescription = null, multPerRock = 0){
		this.name = name;
		this.description = description;
		this.getMachineCount = getMachineCount || (() => Infinity);
		this.activateMachine = activateMachine || (() => {});
		this.extraDescription = extraDescription;
		this.multPerRock = multPerRock;
		this.locked = true;
		this.node = null;
		setTimeout(() => {this.index = realms.findIndex(r => r == this)});
	}

	unlock(){
		this.locked = false;
		this.display();
	}

	display(){
		if (!this.node){
			this.node = document.querySelector("#realm-template").cloneNode(true);
			this.node.removeAttribute("id");
			this.node.querySelector(".name").innerHTML = this.name;
			this.node.querySelector(".description").innerHTML = this.description + '<div class="extra-description"></div>';
			let realmSelect = document.querySelector("#realm-select");
			realmSelect.appendChild(this.node);
			this.node.onclick = () => changeRealms(this.index);
			if (this.extraDescription){
				this.node.onmouseover = () => {
					this.node.querySelector(".extra-description").innerHTML = this.extraDescription();
				};
			}
		}
	}

	getNextActivateAmount(){
		return this.getMachineCount() == 1 ? 1 : 5 * Math.pow(2, this.getMachineCount() - 1);
	}
}

function changeRealms(newRealm){
	// Reset the zones first to apply mana gained to the appropriate realm.
	zones.forEach(z => z.resetZone());
	currentRealm = newRealm;
	zones.forEach(z => z.routesChanged = true);
	recalculateMana();
	runes.forEach(r => r.updateDescription());
	let realmSelect = document.querySelector("#realm-select");
	let currentActiveRealm = realmSelect.querySelector(".active-realm");
	if (currentActiveRealm) currentActiveRealm.classList.remove("active-realm");
	if (realmSelect.children[currentRealm]) realmSelect.children[currentRealm].classList.add("active-realm");
	resetLoop();
}

function getRealmMult(name){
	let realm = getRealm(name);
	if (realm.mult === undefined || realm.mult === null){
		realm.mult = zones.reduce((a, z) => {
			return a + z.mapLocations
				.flat()
				.filter(l => l.type.name == "Mana-infused Rock")
				.reduce((a, c) => a + c.priorCompletionData[2], 0);
		}, 0) * realm.multPerRock;
	}
	return realm.mult + 1;
}

function getVerdantMultDesc(){
	return `Total multiplier: x${writeNumber(getRealmMult("Verdant Realm"), 4)}`;
}

function getCompoundingMultDesc(){
	return `Stat slowdown start: ${writeNumber(100 + getRealmMult("Compounding Realm"), 4)}`;
}

const verdantMapping = {
	"#": "♠", // Limestone -> Mushroom
	"√": "♠", // Limestone (Goal) -> Mushroom
	"«": "♣", // Travertine -> Kudzushroom
	"╖": "α", // Granite -> Sporeshroom
	"╣": "§", // Basalt -> Oystershroom
	"????": "????", // Chert
}

function convertMapToVerdant(map){
	return map.map(row => [...row].map(cell => verdantMapping[cell] || cell).join(""));
}

let realms = [
	// Default realm, no special effects.
	new Realm(
		"Core Realm",
		"Where you started.  Hopefully, how you'll leave this cave complex.",
		() => clones.length,
		() => Clone.addNewClone(),
	),

	// Double mana cost on everything.
	// All stuff costs except for making bars and vaporizing gold is doubled.
	new Realm(
		"Long Realm",
		"A realm where everything takes thrice as long and costs twice as much (except bars and vaporizing gold).  It will help you slow down how quickly mana rocks become harder to mine.",
		() => (getRune("Duplication").upgradeCount || 0) + 3,
		() => {
			getRune("Duplication").upgradeCount++;
			getMessage("Upgraded Duplication Rune").display();
		},
	),

	// All rock-type locations become mushroom-type locations.
	// Mushroom growth rate is doubled.
	new Realm(
		"Verdant Realm",
		"A realm where mushrooms have overgrown everything, and they grow five times as fast.  You'll learn how to get mana from gold more efficiently (0.05% per mana rock completion).",
		() => (getRune("Wither").upgradeCount || 0) + 3,
		() => {
			getRune("Wither").upgradeCount++;
			getMessage("Upgraded Wither Rune").display();
		},
		getVerdantMultDesc,
		0.0005,
	),

	// Clones cannot help each other at all.
	new Realm(
		"Compounding Realm",
		"A realm where things get harder the more you do.  Each action completed (including walking - and pathfinding doesn't save you on that) increases the amount of time each subsequent task will take by 2.5%.  You'll get better at learning from repeated tasks (stat slowdown will start 0.01 points later per mana rock completion).",
		() => Infinity,
		() => {},
		getCompoundingMultDesc,
		0.01
	),
];

function getRealm(name) {
	return realms.find(a => a.name == name);
}
