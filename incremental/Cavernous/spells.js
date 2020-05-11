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

	createNode(index) {
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
		this.node.setAttribute("onclick", `addRuneAction(${spells.indexOf(this)}, "spell")`);
		document.querySelector("#spells").appendChild(this.node);
		document.querySelectorAll(".rune-spell-toggle").forEach(n => n.style.display = "inline-block");
		let actionButtonNode = document.querySelector("#add-action-" + this.name.toLowerCase().replace(" ", "-")).parentNode;
		actionButtonNode.classList.remove("hidden-action");
		actionButtonNode.parentNode.classList.remove("hidden-action");
	}

	cast() {
		if (clones[currentClone].activeSpells.find(spell => spell == this)) return true;
		let mana = getStat("Mana");
		if (mana.current < this.castManaCost) return false;
		mana.spendMana(this.castManaCost);
		clones[currentClone].activeSpells.push(this);
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

	canAddToQueue() {
		return !!this.node;
	}
}

function updateSpells(base){
	if (base > 75){
		getMessage("Arcane Shield").display();
	}
	for (let i = 0; i < spells.length; i++){
		if (spells[i].skill < base){
			spells[i].createNode(i);
		}
	}
}

let spells = [
	new Spell("Arcane Shield", "A", 75, 0, 1, true, "Shield yourself with magic!  Any damage taken will be deducted from your mana instead of injuring you."),
	new Spell("Mystic Blade", "M", 100, 0, 5, true, "Sharpen your blades with arcane might!  Any damage you deal will be doubled."),
];
