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
	realmSelect.children[currentRealm].classList.add("active-realm");
	resetLoop();
}

let realms = [
	// Default realm, no special effects.
	new Realm("Core Realm", "Where you started.  Hopefully, how you'll leave this cave complex."),

	// Double mana cost on everything.
	// All stuff costs except for making bars and vaporizing gold is doubled.
	new Realm("Long Realm", "A realm where everything takes thrice as long and costs twice as much (except bars and vaporizing gold).  It will help you slow down how quickly mana rocks become harder to mine."),

	// All rock-type locations become mushroom-type locations.
	// Mushroom growth rate is doubled.
	new Realm("Verdant Realm", "A realm where mushrooms have overgrown everything, and they grow twice as fast.  You'll learn how to get mana from gold more efficiently."),
];