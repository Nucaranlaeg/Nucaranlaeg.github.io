let currentRealm = 0;

class Realm {
	constructor(name, description){
		this.name = name;
		this.description = description;
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
			this.node.querySelector(".description").innerHTML = this.description;
			let realmSelect = document.querySelector("#realm-select");
			realmSelect.appendChild(this.node);
			this.node.onclick = () => changeRealms(this.index);
		}
	}
}

function changeRealms(newRealm){
	currentRealm = newRealm;
	recalculateMana();
	let realmSelect = document.querySelector("#realm-select");
	let currentActiveRealm = realmSelect.querySelector(".active-realm");
	if (currentActiveRealm) currentActiveRealm.classList.remove("active-realm");
	if (realmSelect.children[currentRealm]) realmSelect.children[currentRealm].classList.add("active-realm");
	resetLoop();
}

function getVerdantRealmManaMult(){
	let realm = getRealm("Verdant Realm");
	if (realm.manaMult === undefined || realm.manaMult === null){
		realm.manaMult = zones.reduce((a, z) => {
			return a + z.mapLocations
				.flat()
				.filter(l => l.type.name == "Mana-infused Rock")
				.reduce((a, c) => a + c.priorCompletionData[2], 0);
		}, 0) * 0.0005;
	}
	return realm.manaMult + 1;
}

const verdantMapping = {
	"#": "♠", // Limestone -> Mushroom
	"√": "♠", // Limestone (Goal) -> Mushroom
	"«": "♣", // Travertine -> Kudzushroom
	"╖": "α", // Granite -> Sporeshroom
	"???": "???", // Basalt
	"????": "????", // Chert
}

function convertMapToVerdant(map){
	return map.map(row => [...row].map(cell => verdantMapping[cell] || cell).join(""));
}

let realms = [
	// Default realm, no special effects.
	new Realm("Core Realm", "Where you started.  Hopefully, how you'll leave this cave complex."),

	// Double mana cost on everything.
	// All stuff costs except for making bars and vaporizing gold is doubled.
	new Realm("Long Realm", "A realm where everything takes thrice as long and costs twice as much (except bars and vaporizing gold).  It will help you slow down how quickly mana rocks become harder to mine."),

	// All rock-type locations become mushroom-type locations.
	// Mushroom growth rate is doubled.
	new Realm("Verdant Realm", "A realm where mushrooms have overgrown everything, and they grow five times as fast.  You'll learn how to get mana from gold more efficiently (0.05% per mana rock completion)."),

	// Clones cannot help each other at all.
	new Realm("Solo Realm", "A realm where clones are incapable of coordinating.  You'll work on your independence and drive, which will make you healthier."),
];

function getRealm(name) {
	return realms.find(a => a.name == name);
}
