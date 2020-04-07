/********************************************* Stats *********************************************/

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
		setTimeout(() => {
			this.update();
		}, 1);
	}

	updateValue() {
		this.value = 100 / (100 + this.current + this.bonus);
	}

	gainSkill(amount) {
		this.current += amount / 10;
		this.update();
	}

	setStat(amount) {
		// For combat stats.
		this.current = this.base + amount;
		this.update();
	}

	update(updateZero) {
		this.updateValue();
		if ((this.current === 0 && !updateZero) && this.name !== "Mana") return;
		if (this.name == "Runic Lore"){
			updateRunes(this.current);
		}
		if (!this.node){
			this.createNode();
		}
		if (this.name == "Mana"){
			this.node.querySelector(".effect").innerHTML = writeNumber(this.current + this.bonus, 1) + "/" + writeNumber(this.base, 1);
		} else if (!this.learnable){
			this.node.querySelector(".effect").innerHTML = writeNumber(this.current + this.bonus, 1);
		} else {
			this.node.querySelector(".effect").innerHTML = `${writeNumber(this.current + this.bonus, 2)} (${writeNumber(this.base, 2)})`;
			this.node.querySelector(".description").innerHTML = this.description + ` (${writeNumber(100 - this.value * 100, 1)}%)`;
		}
	}

	createNode() {
		let statTemplate = document.querySelector("#stat-template");
		this.node = statTemplate.cloneNode(true);
		this.node.id = "stat_" + this.name;
		this.node.querySelector(".name").innerHTML = this.name;
		this.node.querySelector(".icon").innerHTML = this.icon;
		this.node.querySelector(".description").innerHTML = this.description;
		document.querySelector("#stats").appendChild(this.node);
		if (this.name == "Runic Lore"){
			document.querySelector("#runes").style.display = "block";
		}
	}

	reset() {
		this.base = this.getNextLoopValue();
		let isDecreasing = this.current > 0;
		this.current = this.base;
		this.bonus = 0;
		this.update(isDecreasing);
	}

	getNextLoopValue() {
		if (!this.learnable) return this.base;
		let increase = (Math.pow(this.current + 1, 0.9) - (this.base + 1)) / 100
		return this.base + (increase > 0 ? increase : 0);
	}

	spendMana(amount) {
		if (this.name != "Mana") return;
		this.current -= amount;
		this.update();
	}
}

let stats = [
	new Stat("Mana", "", "How long you can resist being pulled back to your cave.", 5, false),
	new Stat("Mining", "⛏", "Your skill at mining, reducing the time it takes to do mining-type tasks."),
	new Stat("Magic", "★", "Your understanding of arcane mysteries."),
	new Stat("Speed", "", "How quick you are."),
	new Stat("Smithing", "🛠", "Your skill at turning raw ores into usable objects."),
	new Stat("Runic Lore", "🕮", "A measure of your understanding of magical runes."),
	new Stat("Combat", "", "Your ability to kill things.", 0),
	new Stat("Attack", "", "How much damage your wild flailing does. (Weapons increase all clones' stats)", 0, false),
	new Stat("Defense", "", "How well you avoid taking damage. (Shields increase all clones' stats)", 0, false),
	new Stat("Health", "", "How many hits you can take until you're nothing more than meat. (Armour increases all clones' stats)", 10, false),
]

/******************************************** Actions ********************************************/

class Action {
	constructor(name, baseDuration, stats, complete, canStart = null, tickExtra = null){
		this.name = name;
		this.baseDuration = baseDuration;
		this.stats = stats.map(s => [getStat(s[0]), s[1]]);
		this.complete = complete || (() => {});
		this.canStart = canStart;
		this.tickExtra = tickExtra;
	}

	start(completions, priorCompletions){
		let durationMult = 1;
		if (this.canStart){
			durationMult = this.canStart(completions, priorCompletions);
			if (durationMult <= 0) return durationMult;
		}
		return this.getDuration(durationMult);
	}

	tick(usedTime, creature){
		for (let i = 0; i < this.stats.length; i++){
			this.stats[i][0].gainSkill(usedTime / 1000 * this.stats[i][1]);
		}
		if (this.tickExtra){
			this.tickExtra(usedTime, creature);
		}
	}

	getDuration(durationMult = 1){
		let duration = this.baseDuration * durationMult;
		for (let i = 0; i < this.stats.length; i++){
			duration *= Math.pow(this.stats[i][0].value, this.stats[i][1]);
		}
		return duration;
	}
}

function completeMove(x, y){
	clones[currentClone].x = x;
	clones[currentClone].y = y;
	setMined(x, y);
}

function completeGoldMine(x, y){
	getStuff("Gold Nugget").update(1);
	completeMove(x, y);
}

function completeIronMine(x, y){
	getStuff("Iron Ore").update(1);
	completeMove(x, y);
}

function completeCoalMine(x, y){
	getStuff("Coal").update(1);
	completeMove(x, y);
}

function completeCollectMana(x, y) {
	getStat("Mana").base += 0.1;
	getStat("Mana").current += 0.1;
	setMined(x, y, ".");
}

function startCollectMana(completions, priorCompletions){
	return completions ? 0 : Math.pow(1.1, priorCompletions);
}

function startCreateClone(completions, priorCompletions){
	let gold = getStuff("Gold Nugget");
	let needed = getNextCloneAmount(completions + priorCompletions);
	return gold.count >= needed ? 1 : -1;
}

function completeCreateClone(x, y){
	clones.push(new Clone());
	resetLoop();
}

function getNextCloneAmount(completions){
	return completions == 0 ? 1 : 5 * Math.pow(2, completions);
}

function simpleConvert(source, target){
	function convert(){
		for (let i = 0; i < source.length; i++){
			let stuff = getStuff(source[i][0]);
			if (stuff.count < source[i][1]) return;
		}
		for (let i = 0; i < source.length; i++){
			let stuff = getStuff(source[i][0]);
			stuff.update(-source[i][1]);
		}
		for (let i = 0; i < target.length; i++){
			let stuff = getStuff(target[i][0]);
			stuff.update(target[i][1]);
		}
	}
	return convert;
}

function simpleRequire(requirement){
	function haveEnough(spend){
		for (let i = 0; i < requirement.length; i++){
			let stuff = getStuff(requirement[i][0]);
			if (stuff.count < requirement[i][1]) return -1;
			// In other functions it's (x, y, creature), so just check that it's exactly true
			// spend is used for placing runes.
			if (spend === true) stuff.update(-requirement[i][1]);
		}
		return 1;
	}
	return haveEnough;
}

function haveBridge(){
	if (getStuff("Iron Bridge").count || getStuff("Steel Bridge").count) return 1;
	return -1;
}

function completeGoldMana(){
	let gold = getStuff("Gold Nugget");
	if (gold.count < 1) return true;
	gold.update(-1);
	getStat("Mana").current += 5;
}

function completeCrossPit(x, y){
	let bridge = getStuff("Iron Bridge");
	if (bridge.count < 1){
		bridge = getStuff("Steel Bridge");
		if (bridge.count < 1 || !settings.useDifferentBridges) return true;
	}
	bridge.update(-1);
	completeMove(x, y);
}

function completeCrossLava(x, y){
	let bridge = getStuff("Steel Bridge");
	if (bridge.count < 1){
		bridge = getStuff("Iron Bridge");
		if (bridge.count < 1 || !settings.useDifferentBridges) return true;
		bridge.update(-1);
		completeMove(x, y);
		getMessage("Lava Can't Melt Steel Bridges").display();
		return;
	}
	bridge.update(-1);
	setMined(x, y, ".");
	completeMove(x, y);
	getMapLocation(x, y).entered = Infinity;
}

function tickFight(usedTime, creature){
	clones[currentClone].takeDamage(Math.max(creature.attack - getStat("Defense").current, 0) * usedTime / 1000);
	if (creature.defense >= getStat("Attack").current && creature.attack <= getStat("Defense").current){
		clones[currentClone].takeDamage(usedTime / 1000);
	}
}

function completeFight(x, y, creature){
	if (creature.health){
		if (creature.defense >= getStat("Attack").current && creature.attack <= getStat("Defense").current){
			creature.health = Math.max(creature.health - 1, 0);
		}
		creature.health = Math.max(creature.health - Math.max(getStat("Attack").current - creature.defense, 0), 0);
	}
	if (!creature.health) return completeMove(x, y);
	return true;
}

function tickHeal(usedTime){
	clones[currentClone].takeDamage(-Math.max(clones[currentClone].damage - (usedTime / 1000 / getStat("Runic Lore").value), 0));
}

function completeHeal(){
	if (clones[currentClone].damage > 0) return true;
}

function startTeleport(){
	for (let y = 0; y < map.length; y++){
		for (let x = 0; x < map[y].length; x++){
			if (map[y][x] == "T"){
				return 1;
			}
		}
	}
	return -1;
}

function completeTeleport(){
	for (let y = 0; y < map.length; y++){
		for (let x = 0; x < map[y].length; x++){
			if (map[y][x] == "T"){
				clones[currentClone].x = x - xOffset;
				clones[currentClone].y = y - yOffset;
			}
		}
	}
}

let actions = [
	new Action("Walk", 100, [["Speed", 1]], completeMove),
	new Action("Mine", 1000, [["Mining", 1], ["Speed", 0.2]], completeMove),
	new Action("Mine Gold", 1000, [["Mining", 1], ["Speed", 0.2]], completeGoldMine),
	new Action("Mine Iron", 2500, [["Mining", 2]], completeIronMine),
	new Action("Mine Coal", 5000, [["Mining", 2]], completeCoalMine),
	new Action("Collect Mana", 1000, [["Magic", 1]], completeCollectMana, startCollectMana),
	new Action("Create Clone", 1000, [], completeCreateClone, startCreateClone),
	new Action("Make Iron Bars", 5000, [["Smithing", 1]], simpleConvert([["Iron Ore", 1]], [["Iron Bar", 1]]), simpleRequire([["Iron Ore", 1]])),
	new Action("Make Steel Bars", 15000, [["Smithing", 1]], simpleConvert([["Iron Bar", 1], ["Coal", 1]], [["Steel Bar", 1]]), simpleRequire([["Iron Bar", 1], ["Coal", 1]])),
	new Action("Turn Gold to Mana", 1000, [["Magic", 1]], completeGoldMana, simpleRequire([["Gold Nugget", 1]])),
	new Action("Cross Pit", 3000, [["Smithing", 1], ["Speed", 0.3]], completeCrossPit, haveBridge),
	new Action("Cross Lava", 6000, [["Smithing", 1], ["Speed", 0.3]], completeCrossLava, haveBridge),
	new Action("Create Bridge", 5000, [["Smithing", 1]], simpleConvert([["Iron Bar", 2]], [["Iron Bridge", 1]]), simpleRequire([["Iron Bar", 2]])),
	new Action("Upgrade Bridge", 12500, [["Smithing", 1]], simpleConvert([["Steel Bar", 1], ["Iron Bridge", 1]], [["Steel Bridge", 1]]), simpleRequire([["Steel Bar", 1], ["Iron Bridge", 1]])),
	new Action("Read", 10000, [["Runic Lore", 2]], null),
	new Action("Create Sword", 7500, [["Smithing", 1]], simpleConvert([["Iron Bar", 3]], [["Iron Sword", 1]]), simpleRequire([["Iron Bar", 3]])),
	new Action("Upgrade Sword", 22500, [["Smithing", 1]], simpleConvert([["Steel Bar", 2], ["Iron Sword", 1]], [["Steel Sword", 1]]), simpleRequire([["Steel Bar", 2], ["Iron Sword", 1]])),
	new Action("Create Shield", 12500, [["Smithing", 1]], simpleConvert([["Iron Bar", 5]], [["Iron Shield", 1]]), simpleRequire([["Iron Bar", 5]])),
	new Action("Upgrade Shield", 27500, [["Smithing", 1]], simpleConvert([["Steel Bar", 2], ["Iron Shield", 1]], [["Steel Shield", 1]]), simpleRequire([["Steel Bar", 2], ["Iron Shield", 1]])),
	new Action("Create Armour", 10000, [["Smithing", 1]], simpleConvert([["Iron Bar", 4]], [["Iron Armour", 1]]), simpleRequire([["Iron Bar", 4]])),
	new Action("Upgrade Armour", 25000, [["Smithing", 1]], simpleConvert([["Steel Bar", 2], ["Iron Armour", 1]], [["Steel Armour", 1]]), simpleRequire([["Steel Bar", 2], ["Iron Armour", 1]])),
	new Action("Attack Creature", 1000, [["Combat", 1]], completeFight, null, tickFight),
	new Action("Teleport", 1000, [["Runic Lore", 1]], completeTeleport, startTeleport),
	new Action("Heal", 1000, [["Runic Lore", 1]], completeHeal, null, tickHeal)
];

// General smithing costs:
// Iron: 2500/bar
// Steel: 7500/bar + cost of iron item
// Bar: Double base

/****************************************** Creatures ********************************************/

class BaseCreature {
	constructor(name, attack, defense, health){
		this.name = name;
		this.attack = attack;
		this.defense = defense;
		this.health = health;
	}
}

let baseCreatures = [
	new BaseCreature("Goblin", 5, 0, 10),
	new BaseCreature("Goblin Chieftain", 7, 3, 20),
	new BaseCreature("Hobgoblin", 8, 4, 15),
];

class Creature {
	constructor(creature, x, y){
		this.creature = creature;
		this.name = creature.name;
		this.attack = creature.attack;
		this.defense = creature.defense;
		this.health = creature.health;
		this.x = x;
		this.y = y;
	}
}

let creatures = [];

/**************************************** Location Types *****************************************/

class LocationType {
	constructor(name, symbol, description, enterAction, presentAction, reset, nextCost, enterCount){
		this.name = name;
		this.symbol = symbol;
		this.description = description;
		this.enterAction = enterAction ? Object.create(getAction(enterAction)) : null;
		this.presentAction = presentAction ? Object.create(getAction(presentAction)) : null;
		this.nextCost = nextCost;
		this.enterCount = enterCount || 1;
		if (reset){
			this.extraReset = reset;
		}
	}

	getEnterAction(entered) {
		if (entered >= this.enterCount){
			return Object.create(getAction("Walk"));
		}
		return this.enterAction;
	}

	reset(){
		if (this.extraReset) return this.extraReset(...arguments)
		return 0;
	}
}

function storeCompletions(completions, priorCompletions){
	return completions + priorCompletions;
}

function getNextCloneAmountCost(completions, priorCompletions){
	return `${getNextCloneAmount(completions + priorCompletions)} gold`;
}

function startCollectManaCost(completions, priorCompletions){
	return `${writeNumber(this.presentAction.getDuration(startCollectMana(completions, priorCompletions)) / 1000, 2)}s`;
}

let locationTypes = [
	new LocationType("Solid Rock", "█", "Rock, too hard to dig through.", null, null, null),
	new LocationType("Tunnel", ".", "A bare stone passage, empty of any ornamentation.", "Walk", null, null),
	new LocationType("Rock", "#", "A whole bunch of rock.", "Mine", null, null),
	new LocationType("Gold ore", "+", "Rocks with veins of gold ore.", "Mine Gold", null, null),
	new LocationType("Iron ore", "%", "Rocks with veins of iron ore.", "Mine Iron", null, null),
	new LocationType("Mana-infused Rock", "¤", "A whole bunch of rock.  But this time, it glows!", "Mine", "Collect Mana", storeCompletions, startCollectManaCost),
	new LocationType("Mana Spring", "*", "Pure mana, flowing out of the rock.  Each time you absorb the mana, the cost to do so next time increases.", "Walk", "Collect Mana", storeCompletions, startCollectManaCost),
	new LocationType("Clone Machine", "♥", "A strange machine labelled 'Clone Machine'.  What could it do?", "Walk", "Create Clone", storeCompletions, getNextCloneAmountCost),
	new LocationType("Vaporizer", "=", "A machine for extracting the magic right out of gold.", "Walk", "Turn Gold to Mana", null),
	new LocationType("Fountain", "^", "A healing fountain, activated by the runes around its base.", "Walk", "Heal", null),
	new LocationType("Pit", " ", "A bottomless pit.", "Cross Pit", null, null),
	new LocationType("Lava", "~", "A bottomless pit full of lava.  At least, you're not going to be walking on the bottom, so it's bottomless enough for you.  Your bridges might not last very long here, but probably long enough for one clone.", "Cross Lava", null, null, null, Infinity),
	new LocationType("Runic Book", '"', "A large book sitting open on a pedestal.", "Walk", "Read", null),
	new LocationType("Goblin", "g", "An ugly humanoid more likely to try and kill you than to let you by.\n{STATS}", "Attack Creature", null, null),
	new LocationType("Goblin Chieftain", "c", "This one is uglier than the last two.  Probably meaner, too.\n{STATS}", "Attack Creature", null, null),
	new LocationType("Hobgoblin", "h", "A large creature looking something like the goblins.  It looks ready to fight.\n{STATS}", "Attack Creature", null, null),
	new LocationType("Weaken Rune", "W", "Weakens adjacent creatures.", "Walk", null, null),
	new LocationType("Teleport To Rune", "T", "This rune allows someone or something to come through from another place.", "Walk", null, null),
	new LocationType("Teleport From Rune", "F", "This rune allows someone to slip beyond to another place.", "Walk", null, null),
	new LocationType("Coal", "○", "Bituminous coal is present in these rocks.", "Mine Coal", null, null),
	new LocationType("Furnace", "╬", "A large box full of fire.", "Walk", "Make Iron Bars", null),
	new LocationType("Anvil - Bridge", "⎶", "An anvil on which you can make a bridge out of 2 iron.", "Walk", "Create Bridge", null),
	new LocationType("Anvil - Sword", ")", "An anvil on which you can make a sword out of 3 iron.", "Walk", "Create Sword", null),
	new LocationType("Anvil - Shield", "[", "An anvil on which you can make a shield out of 5 iron.", "Walk", "Create Shield", null),
	new LocationType("Anvil - Armour", "]", "An anvil on which you can make a suit of armour out of 4 iron.", "Walk", "Create Armour", null),
	new LocationType("Steel Furnace", "▣", "A large box full of fire.  This one has a slot for coal and a slot for iron bars.", "Walk", "Make Steel Bars", null),
	new LocationType("Anvil - Upgrade Bridge", "&", "An anvil on which you can upgrade an iron bridge into a steel bridge using 1 steel bar.", "Walk", "Upgrade Bridge", null),
	new LocationType("Anvil - Upgrade Sword", "(", "An anvil on which you can upgrade an iron sword into a steel sword using 2 steel bars.", "Walk", "Upgrade Sword", null),
	new LocationType("Anvil - Upgrade Shield", "{", "An anvil on which you can upgrade an iron shield into a steel shield using 2 steel bars.", "Walk", "Upgrade Shield", null),
	new LocationType("Anvil - Upgrade Armour", "}", "An anvil on which you can upgrade an iron suit of armour into a steel suit of armour using 2 steel bars.", "Walk", "Upgrade Armour", null),
];

/******************************************* Locations *******************************************/

class Location {
	constructor(x, y, type){
		this.x = x;
		this.y = y;
		this.type = getLocationType(type);
		let creature = getCreature(type);
		if (creature) {
			this.creature = new Creature(creature, x, y);
			creatures.push(this.creature);
		}
		this.priorCompletions = 0;
		this.completions = 0;
		this.entered = 0;
		this.remainingEnter = 0;
		this.remainingPresent = 0;
		this.enterDuration = 0;
		this.presentDuration = 0;
		this.temporaryPresent = null;
	}
	
	start() {
		if (clones[currentClone].x == this.x && clones[currentClone].y == this.y){
			if (this.type.presentAction){
				this.remainingPresent = this.type.presentAction.start(this.completions, this.priorCompletions);
			} else if (this.temporaryPresent){
				this.remainingPresent = this.temporaryPresent.start(this.completions, this.priorCompletions);
			} else {
				return false;
			}
			this.presentDuration = this.remainingPresent;
			return this.remainingPresent;
		}
		let enterAction = this.type.getEnterAction(this.entered);
		if (!enterAction) return false;
		this.remainingEnter = enterAction.start(this.completions, this.priorCompletions);
		this.enterDuration = this.remainingEnter;
		return this.remainingEnter;
	}
	
	tick(time) {
		let usedTime, percent;
		if (clones[currentClone].x == this.x && clones[currentClone].y == this.y){
			usedTime = Math.min(time, this.remainingPresent);
			(this.type.presentAction || this.temporaryPresent).tick(usedTime);
			this.remainingPresent -= usedTime;
			if (this.remainingPresent == 0){
				if ((this.type.presentAction || this.temporaryPresent).complete(this.x, this.y)){
					// Something got taken away in the middle of completing this.
					this.remainingPresent = 1;
					this.usedTime = time;
				} else {
					this.completions++;
				}
			}
			percent = this.remainingPresent / (this.presentDuration || 1);
		} else {
			usedTime = Math.min(time, this.remainingEnter);
			this.type.getEnterAction(this.entered).tick(usedTime, this.creature);
			this.remainingEnter -= usedTime;
			if (this.remainingEnter == 0){
				if (this.type.getEnterAction(this.entered).complete(this.x, this.y, this.creature)){
					if (this.type == "Goblin") getMessage("Goblin").display();
					// If it was a fight it's not over.
					if (this.creature){
						this.remainingEnter = this.start();
					} else {
						this.remainingEnter = 1;
						this.usedTime = time;
					}
				} else {
					this.entered++;
				}
			}
			percent = this.remainingEnter / (this.enterDuration || 1);
		}
		return [time - usedTime, percent];
	}

	setTemporaryPresent(rune){
		if (this.type.presentAction) return false;
		this.temporaryPresent = getAction(rune.activateAction);
		return true;
	}

	reset() {
		this.priorCompletions = this.type.reset(this.completions, this.priorCompletions);
		this.completions = 0;
		this.entered = 0;
		this.remainingEnter = 0;
		this.remainingPresent = 0;
		this.temporaryPresent = null;
	}
}

function viewCell(e){
	let x = e.target.getAttribute("data-x"), y = e.target.getAttribute("data-y");
	let type = [...e.target.classList].find(x => x !== "occupied" && x !== "final-location");
	if (mapLocations[y] && mapLocations[y][x]){
		let location = mapLocations[y][x];
		for (const icon in classMapping){
			if (classMapping[icon][0] == type){
				type = getLocationType(getLocationTypeBySymbol(icon));
				let primaryAction = type.presentAction || type.enterAction;
				document.querySelector("#location-name").innerHTML = type.name;
				if (type.description.includes("{STATS}")){
					let statsDesc = `Attack: ${location.creature.attack}\nDefense: ${location.creature.defense}\nHealth: ${location.creature.health}`;
					type.description = type.description.replace("{STATS}", statsDesc);
				}
				document.querySelector("#location-description").innerHTML = type.description.replace(/\n/g, "<br>");
				if (type.nextCost){
					document.querySelector("#location-next").innerHTML = `Next: ${type.nextCost(location.completions, location.priorCompletions)}`;
				} else if (primaryAction) {
					document.querySelector("#location-next").innerHTML = `Time: ${writeNumber(primaryAction.getDuration() / 1000, 2)}s`;
				} else {
					document.querySelector("#location-next").innerHTML = "";
				}
				return;
			}
		}
	}
}

/********************************************** Map **********************************************/

let map = ['███████████████████████████████████████████',
           '█████████████%%████████████████████████████',
           '█████████████%#▣&██████████████████████████',
           '██+██¤#%█¤█████~███###██)#+████+#%#████████',
           '██#█+#####███%%%¤██#█#██####█%██%█%#███████',
           '██#█ +%#█# #######█#█#██¤█+###█# #+████████',
           '██#█%██#████#██#+#█#█#%███#█###%██%████████',
           '██%█#█%#█+###█¤#█###█#█████##%█%+██████████',
           '██##%█+[██#████ █████#█###█%#██████████████',
           '██%██████████♥###+### ##█#██#¤██+%%##██████',
           '█{#+█%# #+███##█##+█████##██ ██%#███%██████',
           '█████%█+███¤██#+##█████##██##████%%##¤█████',
           '███%█#█#█.##█¤#####%%# ##+####█¤###████████',
           '███###█#██######█╬⎶████#¤███##████ ████████',
           '██████###██#¤████████###%█%█%#+███¤████████',
           '████%##█##█#█¤#██#¤█+#%#██#█████%%##%██████',
           '██##%##██#█###%=█#███%#####¤█¤#%#███%██████',
           '██##c%#█#%███████##███g███████#███(#+██████',
           '████#█#██##+###g##██¤##]███+%~c#███#███████',
           '███○#████████████%+██%###█¤#███##█%#███████',
           '███○##%#○%#██████#####█####%%███#+##%██████',
           '█████○#█#+%%██████+#███"██h████████%███████',
           '██████+#○██}██████████████%%#%█████████████',
           '█████████████████████████+####¤████████████',
           '███████████████████████████#^#+████████████',
           '██████████████████████████¤###%████████████',
           '███████████████████████████████████████████',
];

let originalMap = map.slice();

let xOffset = 9, yOffset = 12;

let mapLocations = [];

let classMapping = {
	"█": ["wall", "Solid Rock"],
	"¤": ["mana", "Mana-infused Rock"],
	"*": ["mined-mana", "Mana Spring"],
	".": ["tunnel", "Dug Tunnel"],
	"#": ["rock", "Rock"],
	"♥": ["clone-machine", "Strange Machine"],
	"+": ["gold", "Gold Ore"],
	"%": ["iron", "Iron Ore"],
	"╬": ["furnace", "Furnace"],
	"▣": ["furnace", "Steel Furnace"],
	"=": ["vaporizer", "Vaporizer"],
	"⎶": ["bridge", "Anvil - Bridge"],
	"&": ["bridge2", "Anvil - Upgrade Bridge"],
	" ": ["pit", "Bottomless Pit"],
	"~": ["lava", "Bottomless Lava"],
	'"': ["book", "Book"],
	")": ["sword", "Anvil - Sword"],
	"[": ["shield", "Anvil - Shield"],
	"]": ["armour", "Anvil - Armour"],
	"(": ["sword2", "Anvil - Upgrade Sword"],
	"{": ["shield2", "Anvil - Upgrade Shield"],
	"}": ["armour2", "Anvil - Upgrade Armour"],
	"^": ["fountain", "Fountain"],
	"W": ["rune-weak", "Weaken Rune"],
	"T": ["rune-to", "Teleport To Rune"],
	"F": ["rune-from", "Teleport From Rune"],
	"○": ["coal", "Coal"],
	"g": ["goblin", "Goblin"],
	"c": ["chieftain", "Goblin Chieftain"],
	"h": ["hobgoblin", "Hobgoblin"],
};

while (mapLocations.length < map.length){
	mapLocations.push([]);
}

function getMapLocation(x, y, adj = false){
	if (!adj && map[y + yOffset][x + xOffset] != "█"){
		getMapLocation(x-1, y-1, true);
		getMapLocation(x, y-1, true);
		getMapLocation(x+1, y-1, true);
		getMapLocation(x-1, y, true);
		getMapLocation(x+1, y, true);
		getMapLocation(x-1, y+1, true);
		getMapLocation(x, y+1, true);
		getMapLocation(x+1, y+1, true);
	}
	x += xOffset;
	y += yOffset;
	if (x < 0 || x >= map[0].length || y < 0 || y >= map.length) return;
	if (!mapLocations[y][x]){
		let mapSymbol = map[y][x];
		mapLocations[y][x] = new Location(x - xOffset, y - yOffset, getLocationTypeBySymbol(mapSymbol));
	}
	return mapLocations[y][x];
}

let mapNodes = [];

function drawNewMap() {
	mapNodes = [];
	let mapNode = document.querySelector("#map-inner");
	while (mapNode.firstChild){
		mapNode.removeChild(mapNode.lastChild);
	}
	let rowTemplate = document.querySelector("#row-template");
	let cellTemplate = document.querySelector("#cell-template");
	for (let y = 0; y < map.length; y++){
		mapNodes[y] = [];
		let rowNode = rowTemplate.cloneNode(true);
		rowNode.removeAttribute("id");
		mapNode.append(rowNode);
		if (mapLocations[y]){
			for (let x = 0; x < map[y].length; x++){
				let cellNode = cellTemplate.cloneNode(true);
				cellNode.removeAttribute("id");
				cellNode.setAttribute("data-x", x);
				cellNode.setAttribute("data-y", y);
				if (mapLocations[y][x]) {
					let [className, descriptor] = classMapping[map[y][x]];
					className = className.split(" ");
					for (let i = 0; i < className.length; i++){
						cellNode.classList.add(className[i]);
					}
					cellNode.setAttribute("data-content", descriptor);
				} else {
					cellNode.classList.add("blank");
				}
				rowNode.append(cellNode);
				mapNodes[y][x] = cellNode;
			}
		}
	}
	isDrawn = true;
	for (let i = 0; i < clones.length; i++){
		mapNode.childNodes[clones[i].y + yOffset].childNodes[clones[i].x + xOffset].classList.add("occupied");
	}
}

let isDrawn = false;

function drawCell(x, y) {
	if (!mapLocations[y][x]) return;
	let cell = mapNodes[y][x];
	let [className, descriptor] = classMapping[map[y][x]];
	if (cell.className != className){
		cell.className = "";
		className = className.split(" ");
		for (let i = 0; i < className.length; i++){
			cell.classList.add(className[i]);
		}
		if (descriptor == "Mana Spring" || descriptor == "Mana-infused Rock"){
			descriptor += " " + mapLocations[y][x].type.nextCost(mapLocations[y][x].completions, mapLocations[y][x].priorCompletions);
		}
		cell.setAttribute("data-content", descriptor);
	} else if (descriptor == "Mana Spring" || descriptor == "Mana-infused Rock"){
		descriptor += " " + mapLocations[y][x].type.nextCost(mapLocations[y][x].completions, mapLocations[y][x].priorCompletions);
		cell.setAttribute("data-content", descriptor);
	}
}

function drawMap() {
	if (!isDrawn) drawNewMap();
	for (let y = 0; y < mapNodes.length; y++){
		if (!mapLocations[y]) continue;
		for (let x = 0; x < mapNodes[y].length; x++){
			drawCell(x, y);
		}
	}
	let mapNode = document.querySelector("#map-inner");
	document.querySelectorAll(".occupied").forEach(el => el.classList.remove("occupied"));
	for (let i = 0; i < clones.length; i++){
		mapNode.childNodes[clones[i].y + yOffset].childNodes[clones[i].x + xOffset].classList.add("occupied");
	}
	showFinalLocation(true);
}

function setMined(x, y, icon){
	x += xOffset;
	y += yOffset;
	let tile = icon || {
		"#": ".",
		"¤": "*",
		"+": ".",
		"%": ".",
		" ": ".",
		"g": ".",
		"○": ".",
		"c": ".",
		"h": ".",
	}[map[y][x]] || map[y][x];
	map[y] = map[y].slice(0, x) + tile + map[y].slice(x + 1);
}

/********************************************* Queue *********************************************/

let queues = [];
let selectedQueue = [];
let savedQueues = [];
let possibleActionIcons = ["★", "✣", "✦", "♣", "♠", "⚑", "×", "⬈", "⬉", "⬊", "⬋"];
let cursor = [0, null];

function addActionToQueue(action, queue = null){
	if (document.querySelector(".saved-queue:focus, .saved-name:focus")) return addActionToSavedQueue(action);
	if (queue === null){
		for (let i = 0; i < selectedQueue.length; i++){
			addActionToQueue(action, selectedQueue[i]);
		}
		showFinalLocation();
		return;
	}
	if (queues[queue] === undefined) return;
	let queueNode = document.querySelector(`#queue${queue} .queue-inner`);
	if (cursor[1] == null){
		if (action == "B") {
			if (queues[queue].length == 0) return;
			queues[queue].pop();
			queueNode.removeChild(queueNode.lastChild);
		} else if ("UDLRI".includes(action) || (action[0] == "N" && !isNaN(+action[1]))) {
			queues[queue].push([action, true]);
			queueNode.append(createActionNode(action));
		}
		scrollQueue(queue, queues[queue].length);
	} else {
		if (action == "B") {
			if (queues[queue].length == 0 || cursor[1] == -1) return;
			queues[queue].splice(cursor[1], 1);
			cursor[1]--;
		} else if ("UDLRI".includes(action) || (action[0] == "N" && !isNaN(+action[1]))) {
			if (cursor[1] >= 0){
				queues[queue].splice(cursor[1] + 1, 0, [action, queues[queue][cursor[1]][1]]);
			} else {
				queues[queue].unshift([action, queues[0][1]])
			}
			cursor[1]++;
		} else {
			// Avoid expensive draws if it somehow got here.
			return;
		}
		redrawQueues();
		scrollQueue(queue, cursor[1]);
		showCursor();
	}
}

function clearQueue(queue = null){
	if (queue === null){
		for (let i = 0; i < selectedQueue.length; i++){
			clearQueue(selectedQueue[i]);
		}
		return;
	}
	if (!confirm("Really clear queue?")) return;
	queues[queue] = [];
	if (cursor[0] == queue){
		cursor[1] = null;
	}
	let queueNode = document.querySelector(`#queue${queue} .queue-inner`);
	while (queueNode.firstChild) {
		queueNode.removeChild(queueNode.lastChild);
	}
	showCursor();
}

function createActionNode(action){
	if (!isNaN(+action)) return createQueueActionNode(action);
	let actionNode = document.querySelector("#action-template").cloneNode(true);
	actionNode.removeAttribute("id");
	let character = {
		"L": settings.useAlternateArrows ? "←" : "🡄",
		"R": settings.useAlternateArrows ? "→" : "🡆",
		"U": settings.useAlternateArrows ? "↑" : "🡅",
		"D": settings.useAlternateArrows ? "↓" : "🡇",
		"I": settings.useAlternateArrows ? "○" : "🞇",
	}[action];
	if (!character){
		character = runes[action[1]].icon;
	}
	actionNode.querySelector(".character").innerHTML = character;
	return actionNode;
}

function createQueueActionNode(queue){
	let actionNode = document.querySelector("#action-template").cloneNode(true);
	actionNode.removeAttribute("id");
	actionNode.style.color = savedQueues[queue].colour;
	actionNode.querySelector(".character").innerHTML = savedQueues[queue].icon;
	actionNode.setAttribute("title", savedQueues[queue].name);
	actionNode.classList.add(`action${queue}`);
	return actionNode;
}

function resetQueueHighlight(queue){
	let nodes = document.querySelectorAll(`#queue${queue} .queue-inner .started`);
	nodes.forEach(n => n.classList.remove("started"));
}

function selectQueueAction(queue, action, percent){
	let queueNode = document.querySelector(`#queue${queue} .queue-inner`);
	this.width = this.width || queueNode.parentNode.clientWidth;
	let nodes = queueNode.querySelectorAll(`.action`);
	let node = nodes[action];
	node.classList.add("started");
	if (queues[queue][action][2]){
		let complete = queues[queue][action][2].findIndex(q => q[`${queue}_${action}`] === undefined);
		percent /= queues[queue][action][2].length;
		percent += (complete / queues[queue][action][2].length) * 100;
	}
	node.querySelector(".progress").style.width = percent + "%";
	// queueNode.parentNode.scrollLeft = Math.max(action * 16 - (this.width / 2), 0);
}

function scrollQueue(queue, action = null){
	if (action === null){
		action = queues[queue].findIndex(a => !a[1]);
	}
	let queueNode = document.querySelector(`#queue${queue} .queue-inner`);
	this.width = this.width || queueNode.parentNode.clientWidth;
	queueNode.parentNode.scrollLeft = Math.max(action * 16 - (this.width / 2), 0);
}

function redrawQueues(){
	for (let i = 0; i < queues.length; i++){
		let queueNode = document.querySelector(`#queue${i} .queue-inner`);
		while (queueNode.firstChild) {
			queueNode.removeChild(queueNode.lastChild);
		}
		for (let j = 0; j < queues[i].length; j++){
			let node = createActionNode(queues[i][j][0]);
			queueNode.append(node);
			if (!queues[i][j][1]){
				node.classList.add("started");
				node.querySelector(".progress").style.width = "100%";
			}
		}
	}
}

function setCursor(event, el){
	let nodes = Array.from(el.parentNode.children);
	cursor[1] = nodes.findIndex(e => e == el) - (event.offsetX < 8);
	if (nodes.length - 1 == cursor[1]) cursor[1] = null;
	cursor[0] = el.parentNode.parentNode.id.replace("queue", "");
	showCursor();
}

function maybeClearCursor(event, el){
	if (event.target == el){
		cursor[1] = null;
	}
}

function showCursor(){
	document.querySelectorAll(".cursor.visible").forEach(el => el.classList.remove("visible"));
	if (cursor[1] == null) return;
	let cursorNode = document.querySelector(`#queue${cursor[0]} .cursor`);
	cursorNode.classList.add("visible");
	cursorNode.style.left = (cursor[1] * 16 + 17) + "px";
}

/****************************************** Saved Queues ******************************************/

function saveQueue(el){
	let queue = el.parentNode.parentNode.id.replace("queue", "");
	savedQueues.push(queues[queue].map(q => [q[0]]).filter(q => isNaN(+q)));
	savedQueues[savedQueues.length - 1].icon = possibleActionIcons[0];
	// Generate random colour.
	savedQueues[savedQueues.length - 1].colour = '#'+Math.floor(Math.random()*16777215).toString(16);
	drawSavedQueues();
}

function deleteSavedQueue(el){
	let queue = el.parentNode.parentNode.id.replace("saved-queue", "");
	if (queues.some(q => q.some(a => a[0] == queue))){
		alert("Can't delete; in use.");
		return;
	}
	savedQueues.splice(queue, 1);
	for (let i = 0; i < queues.length; i++){
		for (let j = 0; j < queues[i].length; j++){
			if (!isNaN(+queues[i][j][0]) && queues[i][j][0] > queue) queues[i][j][0]--;
		}
	}
	drawSavedQueues();
}

function selectSavedQueue(event, el){
	if (!event.target.closest("input") && !event.target.closest("select")) el.focus();
}

function insertSavedQueue(event, el){
	if (event.target.closest("input") || event.target.closest("select")) return;
	console.log(event, event.which);

	let source = el.closest('.saved-queue').id.replace("saved-queue", "");

	for (let target of selectedQueue) {
		let queueNode = document.querySelector('#queue'+target+' .queue-inner')
		queues[target].push([source, true, savedQueues[source]]);
		queueNode.append(createQueueActionNode(source));

	}

	el.closest('.saved-queue').blur()
}

function setSavedQueueName(el){
	let queue = el.parentNode.id.replace("saved-queue", "");
	savedQueues[queue].name = el.value;
	updateSavedIcon(queue);
}

function setSavedQueueIcon(el){
	let queue = el.parentNode.id.replace("saved-queue", "");
	savedQueues[queue].icon = el.value;
	updateSavedIcon(queue);
}

function setSavedQueueColour(el){
	let queue = el.parentNode.id.replace("saved-queue", "");
	savedQueues[queue].colour = el.value;
	el.parentNode.querySelector(".icon-select").style.color = el.value;
	updateSavedIcon(queue);
}

function updateSavedIcon(queue){
	document.querySelectorAll(`.action${queue}`).forEach(node => {
		node.style.color = savedQueues[queue].colour;
		node.querySelector(".character").innerHTML = savedQueues[queue].icon;
		node.setAttribute("title", savedQueues[queue].name);
	});
}

function addActionToSavedQueue(action){
	let queueNode = document.querySelector(".saved-queue:focus");
	if (!queueNode) return; // This occurs when we prevent adding actions because we're typing in a name
	let queue = queueNode.id.replace("saved-queue", "");
	if (savedQueues[queue] === undefined) return;
	queueNode = queueNode.querySelector(".queue-inner");
	if (action == "B") {
		if (savedQueues[queue].length == 0) return;
		savedQueues[queue].pop();
		queueNode.removeChild(queueNode.lastChild);
	} else if ("UDLRI".includes(action) || (action[0] == "N" && !isNaN(+action[1]))) {
		savedQueues[queue].push([action, true]);
		queueNode.append(createActionNode(action));
	}
}

function startSavedQueueDrag(event, el){
	event.dataTransfer.setDragImage(el.querySelector(".icon-select"), 0, 0);
	event.dataTransfer.setData("text/plain", el.id.replace("saved-queue", ""));
	event.dataTransfer.effectAllowed = "copymove";
}

function queueDragOver(event){
	event.preventDefault();
	event.dataTransfer.dropEffect = "copy";
}

function savedQueueDragOver(event, el){
	event.preventDefault();
	if (el.id.replace("saved-queue", "") == event.dataTransfer.getData("text/plain")){
		event.dataTransfer.dropEffect = "none";
		return;
	}
	if (isDropTopHalf(event)){
		el.closest(".bottom-block").style.borderTop = "2px solid";
		el.closest(".bottom-block").style.borderBottom = "";
	} else {
		el.closest(".bottom-block").style.borderTop = "";
		el.closest(".bottom-block").style.borderBottom = "2px solid";
	}
	event.dataTransfer.dropEffect = "move";
}

function savedQueueDragOut(el){
	el.closest(".bottom-block").style.borderTop = "";
	el.closest(".bottom-block").style.borderBottom = "";
}

function isDropTopHalf(event){
	return event.offsetY < 14;
}

function savedQueueDrop(event, el){
	let source = event.dataTransfer.getData("text/plain");
	let target = el.id.replace("queue", "");
	let queueNode = el.querySelector(".queue-inner");
	if (event.ctrlKey){
		for (let i = 0; i < savedQueues[source].length; i++){
			queues[target].push([savedQueues[source][i], true]);
			queueNode.append(createActionNode(savedQueues[source][i][0]));
		}
	} else {
		queues[target].push([source, true, savedQueues[source]]);
		queueNode.append(createQueueActionNode(source));
	}
}

function savedQueueMove(event, el){
	savedQueueDragOut(el);
	let source = event.dataTransfer.getData("text/plain");
	let target = +el.id.replace("saved-queue", "") + (isDropTopHalf(event) ? -1 : 0);
	if (source > target) target++;
	for (let i = 0; i < queues.length; i++){
		for (let j = 0; j < queues[i].length; j++){
			let value = +queues[i][j][0];
			if (!isNaN(value)){
				if (value > source && value <= target){
					queues[i][j][0]--;
				} else if (value < source && value >= target){
					queues[i][j][0]++;
				} else if (value == source){
					queues[i][j][0] = target;
				}
			}
		}
	}
	let oldQueue = savedQueues.splice(source, 1)[0];
	savedQueues.splice(target, 0, oldQueue);
	drawSavedQueues();
}

function drawSavedQueues(){
	let node = document.querySelector("#saved-queues");
	while (node.firstChild){
		node.removeChild(node.lastChild);
	}
	let template = document.querySelector("#saved-queue-template");
	for (let i = 0; i < savedQueues.length; i++){
		let el = template.cloneNode(true);
		el.id = `saved-queue${i}`;
		let queueNode = el.querySelector(".queue-inner");
		while (queueNode.firstChild) {
			queueNode.remove(queueNode.lastChild);
		}
		for (let j = 0; j < savedQueues[i].length; j++){
			queueNode.append(createActionNode(savedQueues[i][j][0]));
		}
		if (savedQueues[i].name) el.querySelector(".saved-name").value = savedQueues[i].name;
		if (savedQueues[i].icon) el.querySelector(".icon-select").value = savedQueues[i].icon;
		if (savedQueues[i].colour){
			el.querySelector(".colour-select").value = savedQueues[i].colour;
			el.querySelector(".icon-select").style.color = savedQueues[i].colour;
		}
		node.append(el);
	}
	node.style.display = savedQueues.length ? "block" : "none";
}

/******************************************* Highlights ******************************************/

function showIntermediateLocation(e){
	let queueNode = e.target.parentNode.parentNode;
	let index = Array.from(queueNode.children).findIndex(node => node == e.target.parentNode);
	let queueNumber = queueNode.parentNode.id.replace("queue", "");
	if (isNaN(+queueNumber)){
		return;
	}
	showLocationAfterSteps(index, queueNumber, false, true);
}

function showLocationAfterSteps(index, queueNumber, isDraw = false, isHover = false){
	if (index == -1) return;
	let x = xOffset; y = yOffset;
	[x, y] = getQueueOffset(x, y, queues[queueNumber], index);
	if (x === undefined) return;
	let target = document.querySelector(`#map-inner`);
	if (!target) return;
	target = target.children[y];
	if (!target) return;
	target = target.children[x];
	document.querySelectorAll(`.${isHover ? 'hover' : 'final'}-location`).forEach(e => e.classList.remove(`${isHover ? 'hover' : 'final'}-location`));
	target.classList.add(`${isHover ? 'hover' : 'final'}-location`);
	if (!isDraw) viewCell({"target": target});
}

function getQueueOffset(x, y, queue, maxIndex){
	for (let i = 0; i <= maxIndex; i++){
		let action = queue[i][0];
		if (!isNaN(+action)){
			[x, y] = getQueueOffset(x, y, savedQueues[action], savedQueues[action].length - 1);
			continue;
		}
		[x, y] = getActionOffset(x, y, action);
		if (!mapLocations[y] || !mapLocations[y][x]) {
			return [undefined, undefined];
		}
	}
	return [x, y];
}

function getActionOffset(x, y, action){
	x += (action == "R") - (action == "L");
	y += (action == "D") - (action == "U");
	if (map[y][x] == "█"){
		x -= (action == "R") - (action == "L");
		y -= (action == "D") - (action == "U");
	}
	return [x, y];
}

function stopHovering(){
	document.querySelectorAll(".hover-location").forEach(e => e.classList.remove("hover-location"));
}

function showFinalLocation(isDraw = false){
	document.querySelectorAll(".final-location").forEach(e => e.classList.remove("final-location"));
	if (selectedQueue[0] !== undefined){
		showLocationAfterSteps(queues[selectedQueue[0]].length - 1, selectedQueue[0], isDraw);
	}
}

/********************************************* Stuff *********************************************/

class Stuff {
	constructor(name, icon, description, colour, count = 0, effect = null){
		this.name = name;
		this.icon = icon;
		this.description = description;
		this.colour = colour;
		this.count = count;
		this.node = null;
		if (effect){
			this.effect = effect;
		}
		setTimeout(() => {
			this.createNode();
			this.update();
		}, 1);
	}

	effect() {}

	update(newCount = 0) {
		if (!this.node) this.createNode();
		this.count += newCount;
		this.effect();
		this.node.innerHTML = this.count;
		if (this.count > 0){
			this.node.parentNode.style.display = "inline-block";
		}
	}

	createNode() {
		if (this.node) return;
		let stuffTemplate = document.querySelector("#stuff-template");
		let el = stuffTemplate.cloneNode(true);
		el.id = "stuff_" + this.name.replace(" ", "_");
		el.querySelector(".name").innerHTML = this.name;
		el.querySelector(".icon").innerHTML = this.icon;
		el.querySelector(".description").innerHTML = this.description;
		el.style.color = setContrast(this.colour);
		el.style.backgroundColor = this.colour;
		document.querySelector("#stuff-inner").appendChild(el);
		this.node = el.querySelector(".count");
	}
}

function calcCombatStats() {
	let attack = [];
	attack.push(...Array(getStuff("Steel Sword").count).fill(2));
	attack.push(...Array(getStuff("Iron Sword").count).fill(1));
	attack = attack.slice(0, clones.length).reduce((a, c) => a + c, 0);
	let defense = [];
	defense.push(...Array(getStuff("Steel Shield").count).fill(2));
	defense.push(...Array(getStuff("Iron Shield").count).fill(1));
	defense = defense.slice(0, clones.length).reduce((a, c) => a + c, 0);
	let health = [];
	health.push(...Array(getStuff("Steel Armour").count).fill(15));
	health.push(...Array(getStuff("Iron Armour").count).fill(5));
	health = health.slice(0, clones.length).reduce((a, c) => a + c, 0);
	getStat("Attack").setStat(attack);
	getStat("Defense").setStat(defense);
	getStat("Health").setStat(health);
	clones.forEach(c => c.styleDamage());
}

let stuff = [
	new Stuff("Gold Nugget", "•", "This is probably pretty valuable.  Shiny!", "#ffd700", 0),
	new Stuff("Iron Ore", "•", "A chunck of iron ore.  Not useful in its current form.", "#777777", 0),
	new Stuff("Iron Bar", "❚", "An iron rod.  Has a faint smell of bacon.", "#777777", 0),
	new Stuff("Iron Bridge", "⎶", "A small iron bridge.", "#777777", 0),
	new Stuff("Iron Sword", ")", "An iron sword.  Sharp! (+1 attack)  Max 1 weapon per clone.", "#777777", 0, calcCombatStats),
	new Stuff("Iron Shield", "[", "An iron shield.  This should help you not die. (+1 defense)  Max 1 shield per clone.", "#777777", 0, calcCombatStats),
	new Stuff("Iron Armour", "]", "An suit of iron armour.  This should help you take more hits. (+5 health)  Max 1 armour per clone.", "#777777", 0, calcCombatStats),
	new Stuff("Steel Bar", "❚", "A steel rod.", "#333333", 0),
	new Stuff("Coal", "○", "A chunk of coal.  Burns hot.", "#222222", 0),
	new Stuff("Steel Bridge", "⎶", "A small steel bridge.", "#222222", 0),
	new Stuff("Steel Sword", ")", "A steel sword.  Sharp! (+2 attack)  Max 1 weapon per clone.", "#222222", 0, calcCombatStats),
	new Stuff("Steel Shield", "[", "A steel shield.  This should help you not die. (+2 defense)  Max 1 shield per clone.", "#222222", 0, calcCombatStats),
	new Stuff("Steel Armour", "]", "A suit of steel armour.  This should help you take more hits. (+15 health)  Max 1 armour per clone.", "#222222", 0, calcCombatStats),
];

/********************************************* Runes ***********************************************/

class Rune {
	constructor(name, icon, skill, isInscribable, manaCost, description, createEvent, activateAction){
		this.name = name;
		this.icon = icon;
		this.skill = skill;
		this.isInscribable = isInscribable;
		this.manaCost = manaCost;
		this.description = description;
		this.createEvent = createEvent;
		this.activateAction = activateAction;
	}

	createNode(index) {
		if (this.node){
			this.node.classList.remove("not-available");
			return;
		}
		let runeTemplate = document.querySelector("#rune-template");
		this.node = runeTemplate.cloneNode(true);
		this.node.id = "rune_" + this.name;
		this.node.querySelector(".index").innerHTML = (index + 1) % 10;
		this.node.querySelector(".name").innerHTML = this.name;
		this.node.querySelector(".icon").innerHTML = this.icon;
		this.node.querySelector(".description").innerHTML = this.description;
		document.querySelector("#runes").appendChild(this.node);
	}

	notAvailable() {
		if (this.node) this.node.classList.add("not-available");
	}

	create(x, y){
		if (map[y + yOffset][x + xOffset] != ".") return true;
		if (this.isInscribable() > 0){
			this.isInscribable(true);
		} else {
			return false;
		}
		let location = getMapLocation(x, y);
		location.setTemporaryPresent(this);
		setMined(x, y, this.icon);
		if (this.createEvent) this.createEvent(x, y);
		drawCell(x, y);
		return true;
	}
}

function updateRunes(current){
	if (current > 5){
		getMessage("Runic Lore").display();
	}
	for (let i = 0; i < runes.length; i++){
		if (runes[i].skill < current){
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

let runes = [
	new Rune("Weaken", "W", 5, simpleRequire([["Iron Bar", 1], ["Gold Nugget", 1]]), 0, "This rune weakens any orthogonally adjacent enemies, decreasing their attack and defense by 1.<br>Requires:<br>1 Iron Bar<br>1 Gold Nugget<br>Runic Lore 5", weakenCreatures),
	new Rune("Teleport To", "T", 10, canPlaceTeleport, 0, "This rune allows someone or something to come through from another place.  Only one can be placed.<br>Requires:<br>1 Iron Bar<br>1 Gold Nugget<br>Runic Lore 10"),
	new Rune("Teleport From", "F", 15, simpleRequire([["Iron Ore", 2]]), 1000, "This rune allows someone to slip beyond to another place.  Interact with it after inscribing it to activate it.<br>Requires:<br>2 Iron Ore<br>Runic Lore 15", null, "Teleport"),
];

/********************************************* Clones **********************************************/

class Clone {
	constructor(){
		this.reset();
		this.createQueue();
	}

	reset() {
		this.x = 0;
		this.y = 0;
		this.currentProgress = 0;
		this.damage = 0;
		this.styleDamage();
	}

	takeDamage(amount) {
		this.damage += amount;
		if (this.damage >= getStat("Health").current) this.damage = Infinity;
		this.styleDamage();
	}

	styleDamage() {
		if (!this.el) return;
		this.el.querySelector(".damage").style.width = Math.min((this.damage / getStat("Health").current) * 100, 100) + "%";
	}

	createQueue() {
		let queueTemplate = document.querySelector("#queue-template");
		this.el = queueTemplate.cloneNode(true);
		this.el.id = `queue${clones.length}`;
		document.querySelector("#queues").append(this.el);
		queues.push([]);
	}
}

function selectClone(target, event){
	if (target.id) {
		let selection = target.id.replace("queue", "");
		if (cursor[0] != selection){
			cursor = [selection, null];
		}
		if (event && event.ctrlKey) {
			cursor = [0, null];
			if (selectedQueue.includes(selection)){
				selectedQueue = selectedQueue.filter(q => q != selection) || [selection];
				target.classList.remove("selected-clone");
			} else {
				selectedQueue.push(selection);
				target.classList.add("selected-clone");
			}
		} else {
			document.querySelectorAll(".selected-clone").forEach(el => el.classList.remove("selected-clone"));
			selectedQueue = [target.id.replace("queue", "")];
			target.classList.add("selected-clone");
		}
	} else {
		if (cursor[0] != target){
			cursor = [target, null];
		}
		document.querySelectorAll(".selected-clone").forEach(el => el.classList.remove("selected-clone"));
		selectedQueue = [target];
		document.querySelector(`#queue${target}`).classList.add("selected-clone");
	}
	showCursor();
	showFinalLocation();
}

let clones = [];

/******************************************** Functions ********************************************/

function getNextAction(clone = currentClone) {
	let index = queues[clone].findIndex(a => a[1]);
	if (index == -1 || isNaN(+queues[clone][index][0])) return [queues[clone][index], index];
	let action = queues[clone][index];
	if (!action[2]){
		action[2] = savedQueues[action[0]];
	}
	let nextAction = action[2].find(a => a[`${clone}_${index}`] === undefined);
	if (!nextAction) return [undefined, -1];
	return [[nextAction[0], nextAction[`${clone}_${index}`] === undefined], index];
}

function completeNextAction(clone = currentClone) {
	let index = queues[clone].findIndex(a => a[1]);
	let action = queues[clone][index];
	clones[clone].currentCompletions = null;
	if (!action) return;
	if (isNaN(+action[0])){
		action[1] = false;
		return;
	}
	let nextAction = action[2].find(a => a[`${clone}_${index}`] === undefined);
	nextAction[`${clone}_${index}`] = false;
	if (action[2].every(a => a[`${clone}_${index}`] === false)) action[1] = false;
}

function getAction(name) {
	return actions.find(a => a.name == name);
}

function getLocationType(name) {
	return locationTypes.find(a => a.name == name);
}

function getLocationTypeBySymbol(symbol) {
	return locationTypes.find(a => a.symbol == symbol).name;
}

function getStat(name) {
	return stats.find(a => a.name == name);
}

function getStuff(name) {
	return stuff.find(a => a.name == name);
}

function getMessage(name) {
	return messages.find(a => a.name == name);
}

function getCreature(search) {
	if (typeof(search) == "string") {
		return baseCreatures.find(a => a.name == search);
	} else {
		return creatures.find(c => c.x == search[0] && c.y == search[1]);
	}
}

function writeNumber(value, decimals = 0) {
	return value.toFixed(decimals);
}

function setContrast(colour) {
	darkness = (parseInt(colour.slice(1, 3), 16) * 299 + parseInt(colour.slice(3, 5), 16) * 587 + parseInt(colour.slice(5, 7), 16) * 114) / 1000;
	return darkness > 125 ? "#000000" : "#ffffff";
}

function redrawOptions() {
	document.querySelector("#time-banked").innerHTML = writeNumber(timeBanked / 1000, 1);
}

window.ondrop = e => e.preventDefault();

/******************************************** Prestiges ********************************************/

function resetLoop() {
	let mana = getStat("Mana");
	getMessage("Time Travel").display(mana.base == 5);
	if (mana.base >= 6) getMessage("Strip Mining").display();
	stats.forEach(s => s.reset());
	queues.forEach((q, i) => {
		q.forEach(a => {
			a[1] = true;
			a[2] = undefined;
		});
		resetQueueHighlight(i);
	});
	stuff.forEach(s => {
		s.count = 0;
		s.update();
	});
	clones.forEach(c => c.reset());
	mapLocations.forEach(ml => {
		ml.forEach(l => l.reset());
	})
	queueTime = 0;
	currentActionDetails = null;
	savedQueues = savedQueues.map(q => {
		let [name, icon, colour] = [q.name, q.icon, q.colour];
		q = q.map(a => [a[0]]);
		q.name = name;
		q.icon = icon;
		q.colour = colour;
		return q;
	});
	creatures.forEach(c => {
		c.attack = c.creature.attack;
		c.defense = c.creature.defense;
		c.health = c.creature.health;
	});
	map = originalMap.slice();
	drawMap();
	save();
	showFinalLocation();
}

/******************************************** Messages ********************************************/

class Message {
	constructor(name, message){
		this.name = name;
		this.message = message.replace(/\n/g, "<br>");
		this.displayed = false;
	}

	display(show_again){
		if (this.displayed && !show_again) return;
		let box = document.querySelector("#message-box");
		document.querySelector("#message-title").innerHTML = this.name;
		document.querySelector("#message-text").innerHTML = this.message;
		box.style.display = "block";
		this.displayed = true;
	}
}

function hideMessages(){
	document.querySelector("#message-box").style.display = "none";
}

function viewMessages(){
	document.querySelector("#message-title").innerHTML = "Messages";
	let box = document.querySelector("#message-box");
	box.style.display = "block";
	let text = box.querySelector("#message-text");
	while (text.firstChild){
		text.removeChild(text.lastChild);
	}
	let template = document.querySelector("#message-link-template");
	for (let i = 0; i < messages.length; i++){
		if (!messages[i].displayed) continue;
		let el = template.cloneNode(true);
		el.innerHTML = messages[i].name;
		el.id = `message${i}`;
		text.append(el);
	}
}

function viewMessage(event, el){
	messages[el.id.replace("message", "")].display(true);
	event.stopPropagation();
}

let messages = [
	new Message("Welcome to Cavernous!", "You wake up in a bare room.  One of the walls looks soft enough for you to dig through, but you have a feeling you'll be back here again.\n" +
	            "Move around using the arrow keys to move and the spacebar to interact.\n" +
	            "Click anywhere to continue."),
	new Message("Out of Mana", "You've run out of mana.  You feel drawn back to the room where you started.\n(Click \"Travel back in time\" or press the R key)"),
	new Message("Time Travel", "You're back in the room you first found yourself in.\n" +
	            "This time, you feel slightly more competent than last time, and you know a little of the cave you're in.  Given time, you're sure you can find a way out.\n" +
	            "If you haven't, it would be good to use the spacebar to extract mana from those rocks."),
	new Message("Strip Mining", "It's getting harder to extract mana from that rock.  You'll have to go out and find another rock to extract mana from."),
	new Message("First Clone", "You've created your first clone!  It can carry out actions in exactly the same way you can.\n" +
	            "You can create more clones by bringing more gold to the Clone Machine.  Click on the Clone Machine to find out how much the next clone costs." +
	            "Multiple clones use up the same amount of mana as a single clone, and they can act independently or help each other out."),
	new Message("Goblin", "A strange statue in the passage suddenly moves to attack you as you approach!  This place is stranger than you'd thought."),
	new Message("Runic Lore", "You've mastered the basics of runic lore!  A new action is available to you: Inscribe Rune.\n" +
	            "To use it, press the number corresponding to the desired rune in the runes section of the Stuff panel."),
	new Message("Lava Can't Melt Steel Bridges", "You worked so hard on that bridge, and to see it quickly turn to slag after crossing that lava is sad.\n" +
	            "At least one of your clones made it across."),
];

/********************************************* Saving *********************************************/

function save(){
	let playerStats = stats.map(s => {
		return {
			"name": s.name,
			"base": s.learnable ? s.base : s.getNextLoopValue(),
		};
	});
	let locations = [];
	for (let y = 0; y < mapLocations.length; y++){
		for (let x = 0; x < mapLocations[y].length; x++){
			if (mapLocations[y][x]){
				let loc = mapLocations[y][x];
				locations.push([x - xOffset, y - yOffset, loc.type.reset(loc.completions, loc.priorCompletions)]);
			}
		}
	}
	let cloneData = {
		"count": clones.length,
		"queues": queues.map(queue => {
			return queue.map(q => {
				return q[0];
			});
		}),
	}
	let stored = savedQueues.map(q => {
		return {
			"queue": q,
			"name": q.name,
			"icon": possibleActionIcons.indexOf(q.icon),
			"colour": q.colour,
		};
	});
	let time = {
		"saveTime": Date.now(),
		"timeBanked": timeBanked,
	}
	let messageData = messages.map(m => [m.name, m.displayed]);
	saveString = JSON.stringify({
		"playerStats": playerStats,
		"locations": locations,
		"cloneData": cloneData,
		"stored": stored,
		"time": time,
		"messageData": messageData,
		"settings": settings,
	});
	localStorage["saveGame"] = btoa(saveString);
}

function load(){
	if (!localStorage["saveGame"]) return setup();
	let saveGame = JSON.parse(atob(localStorage["saveGame"]));
	stats.forEach(s => s.current = 0);
	for (let i = 0; i < saveGame.playerStats.length; i++){
		getStat(saveGame.playerStats[i].name).base = saveGame.playerStats[i].base;
	}
	mapLocations = [];
	while (mapLocations.length < map.length){
		mapLocations.push([]);
	}
	for (let i = 0; i < saveGame.locations.length; i++){
		getMapLocation(saveGame.locations[i][0], saveGame.locations[i][1], true).priorCompletions = saveGame.locations[i][2];
	}
	clones = [];
	while (clones.length < saveGame.cloneData.count){
		clones.push(new Clone());
	}
	while (settings.useAlternateArrows != saveGame.settings.useAlternateArrows && saveGame.settings.useAlternateArrows !== undefined) toggleUseAlternateArrows();
	queues = [];
	for (let i = 0; i < saveGame.cloneData.queues.length; i++){
		queues.push(saveGame.cloneData.queues[i].map(q => [q, true]));
	}
	savedQueues = [];
	for (let i = 0; i < saveGame.stored.length; i++){
		savedQueues.push(saveGame.stored[i].queue);
		savedQueues[i].name = saveGame.stored[i].name;
		savedQueues[i].icon = possibleActionIcons[saveGame.stored[i].icon];
		savedQueues[i].colour = saveGame.stored[i].colour;
	}
	ensureLegalQueues();
	drawSavedQueues();
	lastAction = saveGame.time.saveTime;
	timeBanked = saveGame.time.timeBanked;
	for (let i = 0; i < saveGame.messageData.length; i++){
		let message = getMessage(saveGame.messageData[i][0]);
		if (message){
			message.displayed = saveGame.messageData[i][1];
		}
	}
	while (settings.usingBankedTime != saveGame.settings.usingBankedTime) toggleBankedTime();
	while (settings.running != saveGame.settings.running) toggleRunning();
	while (settings.autoRestart != saveGame.settings.autoRestart) toggleAutoRestart();


	selectClone(0);
	redrawQueues();

	// Fix attack and defense
	getStat("Attack").base = 0;
	getStat("Defense").base = 0;

	resetLoop();
}

function ensureLegalQueues(){
	for (let i = 0; i < queues.length; i++){
		if (queues[i].some(q => !isNaN(+q[0]) && q[0] >= savedQueues.length)){
			queues[i] = [];
		}
	}
	for (let i = 0; i < savedQueues.length; i++){
		if (savedQueues[i].some(q => !isNaN(+q[0]) && (q[0] >= savedQueues.length || q[0] === null))){
			savedQueues[i].queue = [];
		}
	}
}

function deleteSave(){
	if (localStorage["saveGame"]) localStorage["saveGameBackup"] = localStorage["saveGame"];
	localStorage.removeItem("saveGame");
	window.location.reload();
}

function exportGame(){
	navigator.clipboard.writeText(localStorage["saveGame"]);
}

function importGame(){
	let saveString = prompt("Input your save");
	save();
	let temp = localStorage["saveGame"];
	localStorage["saveGame"] = saveString;
	try {
		load();
	} catch {
		localStorage["saveGame"] = temp;
		load();
	}
	window.location.reload();
}

/******************************************** Settings ********************************************/

let settings = {
	usingBankedTime: true,
	running: true,
	autoRestart: 0,
	useAlternateArrows: false,
	useWASD: false,
	repeatLast: false,
	useDifferentBridges: true,
}

function toggleBankedTime() {
	settings.usingBankedTime = !settings.usingBankedTime;
	document.querySelector("#time-banked-toggle").innerHTML = settings.usingBankedTime ? "Using" : "Banking";
}

function toggleRunning() {
	settings.running = !settings.running;
	document.querySelector("#running-toggle").innerHTML = settings.running ? "Running" : "Paused";
}

function toggleAutoRestart() {
	settings.autoRestart = (settings.autoRestart + 1) % 4;
	document.querySelector("#auto-restart-toggle").innerHTML = ["Wait when any complete", "Restart when complete", "Restart always", "Wait when all complete"][settings.autoRestart];
}

function toggleUseAlternateArrows() {
	settings.useAlternateArrows = !settings.useAlternateArrows;
	document.querySelector("#use-alternate-arrows-toggle").innerHTML = settings.useAlternateArrows ? "Use default arrows" : "Use alternate arrows";
}

function toggleUseWASD() {
	settings.useWASD = !settings.useWASD;
	document.querySelector("#use-wasd-toggle").innerHTML = settings.useWASD ? "Use arrow keys" : "Use WASD";
	document.querySelector("#auto-restart-key").innerHTML = settings.useWASD ? "C" : "W";
}

function toggleRepeatLast() {
	settings.repeatLast = !settings.repeatLast;
	console.log(settings.repeatLast)
	document.querySelector("#repeat-last-toggle").innerHTML = settings.repeatLast ? "Don't repeat last action" : "Repeat last action";
}

/******************************************** Game loop ********************************************/

let lastAction = Date.now();
let timeBanked = 0;
let queueTime = 0;
let currentClone = 0;

setInterval(() => {
	let time = Date.now() - lastAction;
	let usedBank = 0;
	let mana = getStat("Mana");
	lastAction = Date.now();
	if (mana.current == 0){
		getMessage("Out of Mana").display();
		if (settings.autoRestart == 2){
			resetLoop();
		}
	}
	if (!settings.running || mana.current == 0 || (settings.autoRestart == 0 && queues.some((q, i) => getNextAction(i)[0] === undefined)) || (settings.autoRestart == 3 && queues.every((q, i) => getNextAction(i)[0] === undefined))){
		timeBanked += time / 2;
		redrawOptions();
		return;
	}
	if (time > 1000){
		timeBanked += (time - 1000) / 2;
		time = 1000;
	}
	if (settings.usingBankedTime && time < 100 && timeBanked > 0){
		timeBanked += time;
		usedBank = 100 - time;
		time = Math.min(100, timeBanked);
		timeBanked = Math.floor(timeBanked - time);
	}
	if (time > mana.current * 1000){
		timeBanked += time - mana.current * 1000;
		time = mana.current * 1000;
	}
	let unusedTime = time;
	for (let i = 0; i < clones.length; i++){
		if (clones[i].damage == Infinity) continue;
		currentClone = i;
		unusedTime = Math.min(performAction(time), unusedTime);
	}
	timeBanked += Math.max(unusedTime - usedBank, 0) / 2 + Math.min(usedBank, unusedTime);
	queueTime += time - unusedTime;
	mana.spendMana((time - unusedTime) / 1000);
	if (unusedTime && (settings.autoRestart == 1 || settings.autoRestart == 2)) resetLoop();
	document.querySelector("#queue0 .queue-time .time").innerHTML = writeNumber(queueTime / 1000, 1);
	redrawOptions();
}, 10);

function performAction(time, startTime = null) {
	let nextAction, actionIndex;
	while (time > 0 && ([nextAction, actionIndex] = getNextAction())[0] !== undefined){
		let xOffset = {
			"L": -1,
			"R": 1
		}[nextAction[0]] || 0;
		let yOffset = {
			"U": -1,
			"D": 1
		}[nextAction[0]] || 0;
		if (nextAction[0][0] == "N"){
			if (runes[nextAction[0][1]].create(clones[currentClone].x + xOffset, clones[currentClone].y + yOffset)){
				completeNextAction();
				continue;
			} else {
				return 0;
			}
		}
		let location = getMapLocation(clones[currentClone].x + xOffset, clones[currentClone].y + yOffset);
		if (clones[currentClone].currentCompletions === null) clones[currentClone].currentCompletions = location.completions;
		if ((!xOffset && !yOffset && clones[currentClone].currentProgress && (clones[currentClone].currentProgress < location.remainingPresent || location.remainingPresent == 0))
			|| (clones[currentClone].currentCompletions !== null && clones[currentClone].currentCompletions < location.completions)){
			completeNextAction();
			clones[currentClone].currentProgress = 0;
			selectQueueAction(currentClone, actionIndex, 100);
			continue;
		}
		if ((location.remainingPresent <= 0 && !xOffset && !yOffset) || (location.remainingEnter <= 0 && (xOffset || yOffset))){
			let startStatus = location.start();
			if (startStatus == 0){
				completeNextAction();
				clones[currentClone].currentProgress = 0;
				drawMap();
				selectQueueAction(currentClone, actionIndex, 100);
				continue;
			} else if (startStatus < 0){
				return 0;
			}
		}
		[time, percentRemaining] = location.tick(time);
		selectQueueAction(currentClone, actionIndex, 100 - (percentRemaining * 100));
		clones[currentClone].currentProgress = location.remainingPresent;
		if (!percentRemaining){
			completeNextAction();
			clones[currentClone].currentProgress = 0;
			drawMap();
		}
	}
	if (settings.repeatLast){
		if (queues[currentClone].length && time != startTime){
			queues[currentClone][queues[currentClone].length - 1][1] = true;
			return performAction(time, time);
		}
	}
	return time;
}

function setup(){
	clones.push(new Clone());
	selectClone(0);
	getMapLocation(0,0);
	drawMap();
	getMessage("Welcome to Cavernous!").display();
}

/****************************************** Key Bindings ******************************************/

let keyFunctions = {
	"ArrowLeft": () => {
		addActionToQueue("L");
	},
	"ArrowUp": () => {
		addActionToQueue("U");
	},
	"ArrowRight": () => {
		addActionToQueue("R");
	},
	"ArrowDown": () => {
		addActionToQueue("D");
	},
	"Space": e => {
		addActionToQueue("I");
	},
	"Backspace": e => {
		addActionToQueue("B");
		if (e.ctrlKey){
			clearQueue();
		}
	},
	"KeyW": () => {
		if (settings.useWASD){
			addActionToQueue("U");
		} else {
			toggleAutoRestart();
		}
	},
	"KeyA": () => {
		if (settings.useWASD){
			addActionToQueue("L");
		}
	},
	"KeyS": () => {
		if (settings.useWASD){
			addActionToQueue("D");
		}
	},
	"KeyD": () => {
		if (settings.useWASD){
			addActionToQueue("R");
		}
	},
	"KeyR": () => {
		resetLoop();
	},
	"KeyP": () => {
		toggleRunning();
	},
	"KeyB": () => {
		toggleBankedTime();
	},
	"Tab": e => {
		if (e.shiftKey){
			selectClone((clones.length + selectedQueue[selectedQueue.length - 1] - 1) % clones.length);
		} else {
			selectClone((selectedQueue[selectedQueue.length - 1] + 1) % clones.length);
		}
		e.preventDefault();
		e.stopPropagation();
	},
	"KeyC": () => {
		if (settings.useWASD){
			toggleAutoRestart();
		}
	},
	"End": () => {
		cursor[1] = null;
		showCursor();
	},
	"Digit1": () => {
		addActionToQueue("N0");
	},
	"Digit2": () => {
		addActionToQueue("N1");
	},
	"Digit3": () => {
		addActionToQueue("N2");
	},
};

setTimeout(() => {
	let templateSelect = document.querySelector("#saved-queue-template .icon-select");
	for (let i = 0; i < possibleActionIcons.length; i++){
		let el = document.createElement("option");
		el.value = possibleActionIcons[i];
		el.innerHTML = possibleActionIcons[i];
		templateSelect.append(el);
	}
	document.body.onkeydown = e => {
		hideMessages();
		if (!document.querySelector("input:focus")){
			let key = e.code;
			if (keyFunctions[key]){
				e.preventDefault();
				keyFunctions[key](e);
			}
		}
	};
	load();
});
