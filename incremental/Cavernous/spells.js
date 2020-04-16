class Spell {
	constructor(name, icon, skill, castManaCost, sustainManaCost, endOnCombat, description){
		this.name = name;
		this.icon = icon;
		this.skill = skill;
		this.castManaCost = castManaCost;
		this.sustainManaCost = sustainManaCost;
		this.endOnCombat = endOnCombat;
		this.description = description;
	}

	createNode() {
		if (this.node){
			return;
		}
		let spellTemplate = document.querySelector("#spell-template");
		this.node = spellTemplate.cloneNode(true);
		this.node.id = "spell_" + this.name;
		this.node.querySelector(".index").innerHTML = (index + 1) % 10;
		this.node.querySelector(".name").innerHTML = this.name;
		this.node.querySelector(".icon").innerHTML = this.icon;
		this.node.querySelector(".description").innerHTML = this.description;
		document.querySelector("#spells").appendChild(this.node);
	}

	cast() {
		if (currentClone.activeSpells.find(this)) return true;
		let mana = getStat("Mana");
		if (mana.current < this.castManaCost) return false;
		mana.spendMana(this.castManaCost);
		currentClone.activeSpells.push(this);
		return true;
	}

	sustain(time) {
		let mana = getStat("Mana");
		let cost = this.sustainManaCost * time / 1000;
		if (mana.current < cost){
			mana.spendMana(mana.current);
		} else {
			mana.spendMana(cost);
		}
	}
}

function updateSpells(current){
	if (current > 75){
		getMessage("Arcane Shield").display();
	}
	for (let i = 0; i < spells.length; i++){
		if (spells[i].skill < current){
			spells[i].createNode(i);
		}
	}
}

let spells = [
	new Spell("Arcane Shield", "A", 75, 0, 1, true, "Shield yourself with magic!  Any damage taken will be deducted from your mana instead of injuring you."),
	new Spell("Mystic Blade", "M", 100, 0, 5, true, "Sharpen your blades with arcane might!  Any damage you deal will be doubled."),
];
