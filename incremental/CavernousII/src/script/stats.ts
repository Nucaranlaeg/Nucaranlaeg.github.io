class Stat<statName extends anyStatName> {
	name: statName;
	icon: string;
	description: string;
	current: number;
	base: number;
	learnable: boolean;
	bonus: number;
	node: HTMLElement | null;
	value: number;
	dirty: boolean;
	lastIncreaseRequired: number;
	lastIncreaseUpdate: number;
	min: number;
	effectNode: HTMLElement | null = null;
	descriptionNode: HTMLElement | null = null;

	constructor(name: statName, icon: string, description: string, base = 0, learnable = true) {
		this.name = name;
		this.icon = icon;
		this.description = description;
		this.current = this.base = this.min = base;
		this.learnable = learnable;
		this.bonus = 0;
		this.node = null;
		this.value = 1;
		this.dirty = false;
		this.lastIncreaseRequired = 0;
		this.lastIncreaseUpdate = this.base;
	}

	updateValue(): void {
		if (this.current < 100) {
			this.value = 100 / (100 + this.current + this.bonus);
		} else {
			this.value = 100 / (100 + (this.current * (100 + this.bonus)) / 100);
		}
		this.dirty = true;
	}

	get baseValue(): number {
		return 100 / (100 + this.base);
	}

	gainSkill(amount: number): void {
		if (isNaN(+amount)) {
			return;
		}
		const prev = this.current;
		this.current += amount / 10;
		this.dirty = true;
		if (this.current > 5 && prev <= 5) {
			getMessage("Learning").display();
		}

		if (!this.learnable) {
			return;
		}
		const scalingStart = 99 + getRealmMult("Compounding Realm");
		const val = (this.current + 1) ** (0.9 * (this.base > scalingStart ? scalingStart / this.base : 1) ** 0.05) - (this.base + 1);
		if (val < 0) {
			return;
		}
		let prevVal = (prev + 1) ** (0.9 * (this.base > scalingStart ? scalingStart / this.base : 1) ** 0.05) - (this.base + 1);
		if (prevVal < 0) {
			prevVal = 0;
		}
		const increase = (val - prevVal) / this.statIncreaseDivisor * (0.99 + getRealmMult("Compounding Realm") / 100);
		this.base += increase;
	}

	setStat(amount: number): void {
		if (isNaN(+amount)) {
			return;
		}
		// For combat stats.
		this.current = this.base + amount;
		this.dirty = true;
	}

	update(forceIncreaseAtUpdate = false): void {
		if (!this.dirty) {
			return;
		}
		this.updateValue();
		if (!this.node || !this.effectNode || !this.descriptionNode) {
			if ((this.base === 0 && this.current === 0) || (["Health", "Attack", "Defense"].includes(this.name) && getStat("Combat").base === 0)) {
				return;
			}
			this.createNode();
			this.effectNode = this.node!.querySelector(".effect") as HTMLElement;
			this.descriptionNode = this.node!.querySelector(".description") as HTMLElement;
		}
		if (this.name === "Mana") {
			this.effectNode.innerText = `${writeNumber(
				this.current < 100 ? this.current + this.bonus : this.current * (1 + this.bonus / 100),
				1
			)} (${writeNumber(this.base, 1)})`;
		} else if (!this.learnable) {
			this.effectNode.innerText = writeNumber(this.current < 100 ? this.current + this.bonus : this.current * (1 + this.bonus / 100), 1);
		} else {
			this.effectNode.innerText = `${writeNumber(
				this.current < 100 ? this.current + this.bonus : this.current * (1 + this.bonus / 100),
				2
			)} (${writeNumber(this.base, 2)})`;
			let increaseRequired;
			const scalingStart = 99 + getRealmMult("Compounding Realm");
			if (this.base < scalingStart) {
				increaseRequired = (this.base + 1) ** (10 / 9) - 1;
			} else if (!forceIncreaseAtUpdate && this.lastIncreaseRequired && this.base - 0.01 < this.lastIncreaseUpdate) {
				increaseRequired = this.lastIncreaseRequired;
			} else {
				let v = this.base;
				let step = this.base;
				while (true) {
					const val = (v + 1) ** ((0.9 * scalingStart ** 0.05) / this.base ** 0.05) - (this.base + 1);
					if (Math.abs(val) < 0.1) {
						break;
					}
					if (step < 0.1) {
						break;
					}
					if (val > 0) {
						v -= step;
						step /= 2;
					}
					if (val < 0) {
						v += step;
					}
				}
				increaseRequired = v;
				this.lastIncreaseRequired = increaseRequired;
				this.lastIncreaseUpdate = this.base;
			}
			const grindRoute = GrindRoute.getBestRoute(this.name);
			this.descriptionNode.innerText = `${this.description} (${writeNumber(100 - this.value * 100, 1)}%)
			Increase at: ${writeNumber(increaseRequired, 2)}
			Current: ${writeNumber(this.current, 2)} + ${writeNumber(this.current < 100 ? this.bonus : this.current * (100 + this.bonus) / 100 - this.current, 2)}` +
			(grindRoute ? `
			Click to load best grind route (projected +${writeNumber(grindRoute?.projectedGain || 0, 3)}) in ${writeNumber(grindRoute?.totalTime / 1000 || 0, 1)}s
			This route is in the ${realms[grindRoute.realm].name}.
			Ctrl-click to delete this stat's grind route.` : "");
		}
		this.dirty = false;
	}

	createNode(): void {
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
		const statTemplate = document.querySelector("#stat-template") as HTMLElement | null;
		if (statTemplate === null) {
			throw new Error("No stat template");
		}
		this.node = statTemplate.cloneNode(true) as HTMLElement;
		this.node.id = "stat_" + this.name.replace(" ", "-");
		this.node.querySelector(".name")!.innerHTML = this.name;
		this.node.querySelector(".icon")!.innerHTML = this.icon.length ? this.icon : "&nbsp";
		this.node.querySelector(".description")!.innerHTML = this.description;
		this.node.addEventListener("click", this.loadGrindRoute.bind(this));
		document.querySelector("#stats")!.appendChild(this.node);
		if (this.name === "Runic Lore") {
			if (!document.querySelector(".active-pane")) {
				document.querySelector("#runes")!.classList.add("active-pane");
			}
		}
	}

	loadGrindRoute(event: KeyboardEvent | MouseEvent) {
		if (!this.learnable) return;
		if (event?.ctrlKey || event?.metaKey){
			GrindRoute.deleteRoute(this.name);
			this.dirty = true;
			this.update();
		} else {
			GrindRoute.getBestRoute(this.name)?.loadRoute();
		}
	}

	reset(): void {
		if (this.name === "Mana") {
			this.base = 5;
		}
		if (this.current === this.base && this.bonus === 0) {
			return;
		}
		this.current = this.base;
		this.bonus = 0;
		this.dirty = true;
	}

	get statIncreaseDivisor(): number {
		return settings.debug_statIncreaseDivisor || 100;
	}

	spendMana(amount: number): void {
		if (this.name !== "Mana") {
			return;
		}
		this.current -= amount;
		if (this.current < 0) {
			this.current = 0;
		}
		this.dirty = true;
		this.min = Math.min(this.current, this.min);
	}

	getBonus(amount: number): void {
		this.bonus += amount;
		this.dirty = true;
		this.update();
	}
}

type anyStatName = "Mana" | "Mining" | "Woodcutting" | "Magic" | "Speed" | "Smithing" | "Runic Lore" | "Combat" | "Gemcraft" | "Chronomancy" | "Attack" | "Defense" | "Health";

const stats:Stat<anyStatName>[] = [
	new Stat("Mana", "", "How long you can resist being pulled back to your cave.  Also increases the maximum speed the game runs at.", 5, false),
	new Stat("Mining", "⛏", "Your skill at mining, reducing the time it takes to do mining-type tasks."),
	new Stat("Woodcutting", "", "How good you are at chopping down mushrooms of various kinds."),
	new Stat("Magic", "★", "Your understanding of arcane mysteries."),
	new Stat("Speed", "", "How quick you are."),
	new Stat("Smithing", hammerSVG, "Your skill at turning raw ores into usable objects."),
	new Stat("Runic Lore", "🕮", "A measure of your understanding of magical runes."),
	new Stat("Combat", "", "Your ability to kill things.", 0),
	new Stat("Gemcraft", "", "You pick pretty stuff from the walls - in one piece.", 0),
	new Stat("Chronomancy", "", "Your command of magic has expanded, even affecting the flow of time! (It helps you resist the leeching of time barriers)", 0),
	new Stat("Attack", "", "How much damage your wild flailing does. (Weapons increase all clones' stats)", 0, false),
	new Stat("Defense", "", "How well you avoid taking damage. (Shields increase all clones' stats)", 0, false),
	new Stat("Health", "♥", "How many hits you can take until you're nothing more than meat. (Armour increases all clones' stats)", 10, false)
];
function getStat<nameType extends anyStatName>(name: nameType): Stat<nameType> {
	return stats.find(a => a.name === name) as Stat<nameType>;
}
