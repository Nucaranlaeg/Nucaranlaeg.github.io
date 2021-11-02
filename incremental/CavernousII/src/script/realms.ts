let currentRealm = 0;

class Realm {
	name: string;
	description: string;
	getMachineCount: () => number;
	activateMachine: () => void;
	extraDescription: (() => string) | null;
	multPerRock: number;
	locked: boolean;
	node: HTMLElement | null;
	index: number = -1;
	mult: number | null = null;
	machineCompletions: number = 0;

	constructor(
		name: string,
		description: string,
		getMachineCount: (() => number) | null = null,
		activateMachine: (() => void) | null = null,
		extraDescription: (() => string) | null = null,
		multPerRock: number = 0
	) {
		this.name = name;
		this.description = description;
		this.getMachineCount = getMachineCount ?? (() => Infinity);
		this.activateMachine = activateMachine || (() => {});
		this.extraDescription = extraDescription;
		this.multPerRock = multPerRock;
		this.locked = true;
		this.node = null;
		setTimeout(() => {
			this.index = realms.findIndex(r => r == this);
		});
	}

	unlock() {
		this.locked = false;
		this.display();
	}

	display() {
		if (!this.node) {
			const realmTemplate = document.querySelector("#realm-template");
			if (realmTemplate === null) throw new Error("No realm template found");
			this.node = realmTemplate.cloneNode(true) as HTMLElement;
			this.node.removeAttribute("id");
			this.node.querySelector(".name")!.innerHTML = this.name;
			this.node.querySelector(".description")!.innerHTML = this.description + '<div class="extra-description"></div>';
			let realmSelect = document.querySelector("#realm-select");
			if (realmSelect === null) throw new Error("No realm select found");
			realmSelect.appendChild(this.node);
			this.node.onclick = () => changeRealms(this.index);
			if (this.extraDescription) {
				this.node.onmouseover = () => {
					this.node!.querySelector(".extra-description")!.innerHTML = this.extraDescription!();
				};
			}
		}
	}

	getNextActivateAmount() {
		return this.getMachineCount() == 1 ? 1 : 5 * Math.pow(2, this.getMachineCount() - 1);
	}
}

function changeRealms(newRealm: number) {
	// Reset the zones first to apply mana gained to the appropriate realm.
	zones.forEach(z => z.resetZone());
	currentRealm = newRealm;
	zones.forEach(z => (z.routesChanged = true));
	recalculateMana();
	runes.forEach(r => r.updateDescription());
	let realmSelect = document.querySelector("#realm-select");
	if (realmSelect === null) throw new Error("No realm select found");
	let currentActiveRealm = realmSelect.querySelector(".active-realm");
	if (currentActiveRealm) currentActiveRealm.classList.remove("active-realm");
	if (realmSelect.children[currentRealm]) realmSelect.children[currentRealm].classList.add("active-realm");
	document.querySelector<HTMLElement>("#queue-actions")!.style.display = currentRealm == 3 ? "block" : "none";
	resetLoop();
}

function getRealmMult(name:string, force = false) {
	let realm = getRealm(name);
	if (realm.mult === undefined || realm.mult === null || force) {
		realm.mult =
			zones.reduce((a, z) => {
				return (
					a +
					z.mapLocations
						.flat()
						.filter(l => l.type.name == "Mana-infused Rock")
						.reduce((a, c) => a + c.priorCompletionData[realm.index], 0)
				);
			}, 0) * realm.multPerRock;
	}
	return realm.mult + 1;
}

function getVerdantMultDesc() {
	return `Total multiplier: x${writeNumber(getRealmMult("Verdant Realm", true), 4)}`;
}

function getCompoundingMultDesc() {
	return `Stat slowdown start: ${writeNumber(99 + getRealmMult("Compounding Realm", true), 4)}`;
}

const verdantMapping: {[key: string]: string} = {
	"#": "♠", // Limestone -> Mushroom
	"√": "♠", // Limestone (Goal) -> Mushroom
	"«": "♣", // Travertine -> Kudzushroom
	"╖": "α", // Granite -> Sporeshroom
	"╣": "§", // Basalt -> Oystershroom
	"????": "????" // Chert
};

function convertMapToVerdant(map:Zone["map"]): string[] {
	return map.map(row => [...row].map(cell => verdantMapping[cell] || cell).join(""));
}

const realms:Realm[] = [
	// Default realm, no special effects.
	new Realm(
		"Core Realm",
		"Where you started.  Hopefully, how you'll leave this cave complex.",
		() => clones.length,
		() => Clone.addNewClone()
	),

	// Double mana cost on everything.
	// All stuff costs except for making bars and vaporizing gold is doubled.
	new Realm(
		"Long Realm",
		"A realm where everything takes thrice as long and costs twice as much (except bars and vaporizing gold).  It will help you slow down how quickly mana rocks become harder to mine.",
		() => (getRune("Duplication").upgradeCount || 0) + 3,
		() => {
			getRune("Duplication").upgradeCount++;
			getRune("Duplication").updateDescription();
			getMessage("Upgraded Duplication Rune").display();
		}
	),

	// All rock-type locations become mushroom-type locations.
	// Mushroom growth rate is doubled.
	new Realm(
		"Verdant Realm",
		"A realm where mushrooms have overgrown everything, and they grow five times as fast.  You'll learn how to get mana from gold more efficiently (0.05% per mana rock completion).",
		() => (getRune("Wither").upgradeCount || 0) + 3,
		() => {
			getRune("Wither").upgradeCount++;
			getRune("Wither").updateDescription();
			getMessage("Upgraded Wither Rune").display();
		},
		getVerdantMultDesc,
		0.0005
	),

	// Clones cannot help each other at all.
	new Realm(
		"Compounding Realm",
		"A realm where things get harder the more you do.  Each movement action completed (including walking - and pathfinding doesn't save you on that) increases the amount of time each subsequent task will take by 2.5%.  You'll get better at learning from repeated tasks (stat slowdown will start 0.05 points later per mana rock completion).",
		() => getRealm("Compounding Realm").machineCompletions + 2,
		() => {
			getRealm("Compounding Realm").machineCompletions++;
			getMessage("Time Barriers").display();
		},
		getCompoundingMultDesc,
		0.05
	)
];

function getRealm(name:string) {
	let realm = realms.find(a => a.name == name)
	if (realm === undefined) throw new Error(`No realm with name "${name}" found`);
	return realm
}
