class Stat {
	constructor(name, icon, description, base = 0, learnable = true){
		this.name = name;
		this.icon = icon;
		this.description = description;
		this.current = this.base = base;
		this.learnable = learnable;
		this.bonus = 0;
		this.node = null;
		this.value = 1;
		this.dirty = false;
		this.lastIncreaseRequired = 0;
		this.lastIncreaseUpdate = this.base;
	}

	updateValue() {
		if (this.current < 100){
			this.value = 100 / (100 + this.current + this.bonus);
		} else {
			this.value = 100 / (100 + (this.current * (100 + this.bonus) / 100));
		}
		this.dirty = true;
	}

	get baseValue() {
		return 100 / (100 + this.base);
	}

	gainSkill(amount) {
		if (isNaN(+amount)) return;
		let prev = this.current;
		this.current += amount / 10;
		this.dirty = true;
		if (this.current > 5 && prev <= 5){
			getMessage("Learning").display();
		}

		if (!this.learnable) return;
		let scalingStart = 100 + getRealmMult("Compounding Realm");
		let val = (this.current + 1) ** (0.9 * (this.base > scalingStart ? scalingStart / this.base : 1) ** 0.05) - (this.base + 1);
		if (val < 0) return;
		let prevVal = (prev + 1) ** (0.9 * (this.base > scalingStart ? scalingStart / this.base : 1) ** 0.05) - (this.base + 1);
		if (prevVal < 0) prevVal = 0;
		let increase = (val - prevVal) / this.statIncreaseDivisor;
		this.base += increase;
	}

	setStat(amount) {
		if (isNaN(+amount)) return;
		// For combat stats.
		this.current = this.base + amount;
		this.dirty = true;
	}

	update() {
		if (!this.dirty) return;
		this.updateValue();
		if (!this.node){
			if ((this.base == 0 && this.current == 0) || (["Health", "Attack", "Defense"].includes(this.name) && getStat("Combat").base == 0)) return;
			this.createNode();
			this.effectNode = this.node.querySelector(".effect");
			this.descriptionNode = this.node.querySelector(".description");
		}
		if (this.name == "Mana"){
			this.effectNode.innerText = `${writeNumber(this.current < 100 ? this.current + this.bonus : this.current * (1 + (this.bonus / 100)), 1)} (${writeNumber(this.base, 1)})`;
		} else if (!this.learnable){
			this.effectNode.innerText = writeNumber(this.current < 100 ? this.current + this.bonus : this.current * (1 + (this.bonus / 100)), 1);
		} else {
			this.effectNode.innerText = `${writeNumber(this.current < 100 ? this.current + this.bonus : this.current * (1 + (this.bonus / 100)), 2)} (${writeNumber(this.base, 2)})`;
			let increaseRequired;
			let scalingStart = 100 + getRealmMult("Compounding Realm");
			if (this.base < scalingStart){
				increaseRequired = (this.base + 1) ** (10/9) - 1;
			} else if (this.lastIncreaseRequired && this.base - 0.01 < this.lastIncreaseUpdate){
				increaseRequired = this.lastIncreaseRequired;
			} else {
				let v = this.base, step = this.base;
				while (true){
					let val = (v + 1) ** (0.9 * scalingStart ** 0.05 / this.base ** 0.05) - (this.base + 1);
					if (Math.abs(val) < 0.1) break;
					if (step < 0.1) break;
					if (val > 0){
						v -= step;
						step /= 2;
					}
					if (val < 0) v += step;
				}
				increaseRequired = v;
				this.lastIncreaseRequired = increaseRequired;
				this.lastIncreaseUpdate = this.base;
			}
			this.descriptionNode.innerText = `${this.description} (${writeNumber(100 - this.value * 100, 1)}%)\nIncrease at: ${writeNumber(increaseRequired, 2)}`;
		}
		this.dirty = false;
	}

	createNode() {
		let statTemplate = document.querySelector("#stat-template");
		this.node = statTemplate.cloneNode(true);
		this.node.id = "stat_" + this.name;
		this.node.querySelector(".name").innerHTML = this.name;
		this.node.querySelector(".icon").innerHTML = this.icon.length ? this.icon : "&nbsp";
		this.node.querySelector(".description").innerHTML = this.description;
		document.querySelector("#stats").appendChild(this.node);
		if (this.name == "Runic Lore"){
			if (!document.querySelector(".active-pane")){
				document.querySelector("#runes").classList.add("active-pane");
			}
		} else if (this.name == "Spellcraft" || (this.name == "Magic" && this.base >= 75)){
			document.querySelectorAll(".rune-spell-toggle").forEach(n => n.style.display = "inline-block");
		}
	}

	reset() {
		if (this.name == "Mana") {
			this.base = 5;
		}
		if (this.current === this.base && this.bonus === 0) return;
		this.current = this.base;
		this.bonus = 0;
		this.dirty = true;
	}

	get statIncreaseDivisor() {
		return settings.debug_statIncreaseDivisor || 100;
	}

	spendMana(amount) {
		if (this.name != "Mana") return;
		this.current -= amount;
		if (this.current < -1) alert('Error: overspend mana\nplease send to devs');
		if (this.current < 0) this.current = 0;
		this.dirty = true;
		this.min = Math.min(this.current, this.min);
	}

	getBonus(amount) {
		this.bonus += amount;
		this.dirty = true;
		this.update();
	}
}

let stats = [
	new Stat("Mana", "", "How long you can resist being pulled back to your cave.", 5, false),
	new Stat("Mining", "⛏", "Your skill at mining, reducing the time it takes to do mining-type tasks."),
	new Stat("Woodcutting", "", "How good you are at chopping down mushrooms of various kinds."),
	new Stat("Magic", "★", "Your understanding of arcane mysteries."),
	new Stat("Speed", "", "How quick you are."),
	new Stat("Smithing", hammerSVG, "Your skill at turning raw ores into usable objects."),
	new Stat("Runic Lore", "🕮", "A measure of your understanding of magical runes."),
	new Stat("Spellcraft", "", "Wield the energies you've torn from the ground in powerful ways."),
	new Stat("Combat", "", "Your ability to kill things.", 0),
	new Stat("Gemcraft", "", "You pick pretty stuff from the walls - in one piece.", 0),
	new Stat("Attack", "", "How much damage your wild flailing does. (Weapons increase all clones' stats)", 0, false),
	new Stat("Defense", "", "How well you avoid taking damage. (Shields increase all clones' stats)", 0, false),
	new Stat("Health", "♥", "How many hits you can take until you're nothing more than meat. (Armour increases all clones' stats)", 10, false),
];

function getStat(name) {
	return stats.find(a => a.name == name);
}
