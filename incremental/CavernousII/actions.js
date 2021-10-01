class Action {
	constructor(name, baseDuration, stats, complete, canStart = null, tickExtra = null, specialDuration = () => 1){
		this.name = name;
		this.baseDuration = baseDuration;
		this.stats = stats.map(s => [getStat(s[0]), s[1]]);
		this.complete = complete || (() => {});
		this.canStart = canStart;
		this.tickExtra = tickExtra;
		this.specialDuration = specialDuration;
	}

	start(completions, priorCompletions, x, y){
		let durationMult = 1;
		if (this.canStart){
			durationMult = this.canStart(completions, priorCompletions, x, y);
			if (durationMult <= 0) return durationMult;
		}
		return this.getDuration(durationMult);
	}

	tick(usedTime, creature, baseTime){
		for (let i = 0; i < this.stats.length; i++){
			this.stats[i][0].gainSkill(baseTime / 1000 * this.stats[i][1]);
		}
		if (this.tickExtra){
			this.tickExtra(usedTime, creature, baseTime);
		}
	}

	getDuration(durationMult = 1){
		let duration = (typeof(this.baseDuration) == "function" ? this.baseDuration() : this.baseDuration) * durationMult;
		duration *= this.specialDuration();
		if (currentRealm == 1){
			duration *= 3;
		}
		return duration;
	}

	getBaseDuration(realm = null) {
		let duration = (typeof(this.baseDuration) == "function" ? this.baseDuration() : this.baseDuration) / 1000;
		for (let i = 0; i < this.stats.length; i++) {
			duration *= Math.pow(this.stats[i][0].baseValue, this.stats[i][1]);
		}
		if ((realm !== null ? realm : currentRealm) == 1){
			duration *= 3;
		}
		return duration;
	}

	getProjectedDuration(durationMult = 1, applyWither = 0){
		let duration = (typeof(this.baseDuration) == "function" ? this.baseDuration() : this.baseDuration) * durationMult;
		duration -= applyWither;
		duration *= this.getSkillDiv();
		duration *= this.specialDuration();
		if (currentRealm == 1){
			duration *= 3;
		}
		return duration;
	}

	increaseStat(stat, amount){
		let index = this.stats.findIndex(s => s.name == stat);
		if (index == -1){
			this.stats.push([getStat(stat), amount]);
		} else {
			this.stats[index][1] += amount;
		}
	}

	getSkillDiv(){
		let mult = 1;
		for (let i = 0; i < this.stats.length; i++){
			mult *= Math.pow(this.stats[i][0].value, this.stats[i][1]);
		}
		return mult;
	}
}

function baseWalkLength(){
	return 100 * (currentRealm == 1 ? 3 : 1);
}

function completeMove(x, y){
	clones[currentClone].x = x;
	clones[currentClone].y = y;
	setMined(x, y);
}

function startWalk(noSetWalkTime){
	if (!clones[currentClone].walkTime && !noSetWalkTime) clones[currentClone].walkTime = this.getDuration();
	return 1;
}

function tickWalk(time){
	clones[currentClone].walkTime = Math.max(0, clones[currentClone].walkTime - time);
}

function getDuplicationAmount(x, y){
	let amount = 1;
	let rune_locs = [[x-1, y], [x+1, y], [x, y-1], [x, y+1], [x-1, y+1], [x+1, y+1], [x+1, y-1], [x-1, y-1]];
	for (let i = 0; i < rune_locs.length; i++){
		let location = getMapLocation(...rune_locs[i], true);
		if (location.temporaryPresent && location.temporaryPresent.name == "Charge Duplication"){
			amount += location.completions;
		}
	}
	return amount;
}

function completeGoldMine(x, y){
	let gold = getStuff("Gold Nugget");
	gold.update(getDuplicationAmount(x, y));
	if (gold.count >= 5) getMessage("Mass Manufacturing").display();
	completeMove(x, y);
}

function completeIronMine(x, y){
	let iron = getStuff("Iron Ore");
	iron.update(getDuplicationAmount(x, y));
	completeMove(x, y);
}

function completeCoalMine(x, y){
	getStuff("Coal").update(getDuplicationAmount(x, y));
	completeMove(x, y);
}

function completeSaltMine(x, y){
	getStuff("Salt").update(getDuplicationAmount(x, y));
	completeMove(x, y);
}

function completeCollectMana(x, y) {
	let location = getMapLocation(x, y);
	Route.updateBestRoute(location);
	zones[currentZone].mineComplete();
	setMined(x, y, ".");
	if (settings.autoRestart == 1 && settings.grindMana) shouldReset = true;
}

function tickCollectMana() {
	let clone = clones[currentClone];
	let location = getMapLocation(clone.x, clone.y);
	Route.updateBestRoute(location);
}

function longZoneCompletionMult(x, y, z) {
	if (x === undefined || y === undefined) return 1;
	return 0.99 ** (zones[z].getMapLocation(x, y).priorCompletionData[1] ** 0.75);
}

function mineManaRockCost(completions, priorCompletions, zone, x, y, realm = null) {
	return completions ? 0 : Math.pow(1 + (0.1 + 0.05 * (zone.index + (realm == null ? currentRealm : realm))) * longZoneCompletionMult(x, y, zone.index), priorCompletions);
}

function startCollectMana(completions, priorCompletions, x, y) {
	return mineManaRockCost(completions, priorCompletions, zones[currentZone], x, y);
}

function startCreateClone(completions, priorCompletions){
	let gold = getStuff("Gold Nugget");
	let needed = getNextCloneAmount();
	return gold.count >= needed ? 1 : -1;
}

function completeCreateClone(x, y){
	let gold = getStuff("Gold Nugget");
	let needed = getNextCloneAmount();
	gold.update(-needed);
	Clone.addNewClone();
}

function getNextCloneAmount(){
	return clones.length == 1 ? 1 : 5 * Math.pow(2, clones.length - 1);
}

function simpleConvert(source, target, doubleExcempt = false){
	function convert(){
		let mult = currentRealm == 1 && !doubleExcempt ? 2 : 1;
		for (let i = 0; i < source.length; i++){
			let stuff = getStuff(source[i][0]);
			if (stuff.count < source[i][1] * mult) return;
		}
		for (let i = 0; i < source.length; i++){
			let stuff = getStuff(source[i][0]);
			stuff.update(-source[i][1] * mult);
		}
		for (let i = 0; i < target.length; i++){
			let stuff = getStuff(target[i][0]);
			stuff.update(target[i][1]);
		}
	}
	return convert;
}

function simpleRequire(requirement, doubleExcempt = false){
	function haveEnough(spend){
		let mult = currentRealm == 1 && !doubleExcempt ? 2 : 1;
		for (let i = 0; i < requirement.length; i++){
			let stuff = getStuff(requirement[i][0]);
			if (stuff.count < requirement[i][1] * mult) return -1;
			// In other functions it's (x, y, creature), so just check that it's exactly true
			// spend is used for placing runes.
			if (spend === true) stuff.update(-requirement[i][1] * mult);
		}
		return 1;
	}
	haveEnough.itemCount = requirement.reduce((a, c) => a + c[1], 0);
	return haveEnough;
}

function canMakeEquip(requirement, equipType){
	function canDo(){
		let haveStuff = simpleRequire(requirement)();
		if (haveStuff <= 0) return haveStuff;
		let itemCount = stuff.reduce((a, c) => a + (c.name.includes(equipType) ? c.count : 0), 0);
		if (itemCount >= clones.length) return -1;
		return 1;
	}
	return canDo;
}

function haveBridge(){
	if (getStuff("Iron Bridge").count || getStuff("Steel Bridge").count) return 1;
	return -1;
}

function completeGoldMana(){
	let gold = getStuff("Gold Nugget");
	if (gold.count < 1) return true;
	gold.update(-1);
	let manaMult = getVerdantRealmManaMult();
	getStat("Mana").current += 5 * manaMult;
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

function tickFight(usedTime, creature, baseTime){
	clones[currentClone].takeDamage(Math.max(creature.attack - getStat("Defense").current, 0) * baseTime / 1000);
	if (creature.defense >= getStat("Attack").current && creature.attack <= getStat("Defense").current){
		clones[currentClone].takeDamage(baseTime / 1000);
	}
}

let combatTools = [
	["Iron Axe", 0.01, "Woodcutting"],
	["Iron Pick", 0.01, "Mining"],
	["Iron Hammer", 0.01, "Smithing"]
];

function combatDuration(){
	if (typeof(combatTools[0][0]) == "string"){
		combatTools = combatTools.map(t => [getStuff(t[0]), t[1], getStat(t[2])]);
	}
	let duration = 1;
	for (let i = 0; i < combatTools.length; i++){
		duration *= Math.pow(combatTools[i][2].value, combatTools[i][1] * combatTools[i][0].count);
	}
	return duration;
}

function completeFight(x, y, creature){
	let attack = getStat("Attack").current;
	if (creature.health){
		creature.health = Math.max(creature.health - (Math.max(attack - creature.defense, 0) * (clones[currentClone].activeSpells.find(spell => spell.name == "Mystic Blade") ? 2 : 1)), 0);
		creature.drawHealth();
	}
	if (!creature.health){
		clones.forEach(c => {
			if ((Math.abs(c.x - x) <= 1) + (Math.abs(c.y - y) <= 1)){
				c.activeSpells = c.activeSpells.filter(s => !s.endOnCombat);
			}
		})
		return completeMove(x, y);
	}
	return true;
}

function tickHeal(usedTime){
	clones[currentClone].takeDamage(-usedTime / 1000 / getStat("Runic Lore").value);
}

function completeHeal(){
	if (clones[currentClone].damage > 0) return true;
}

function startTeleport(){
	for (let y = 0; y < zones[currentZone].map.length; y++){
		for (let x = 0; x < zones[currentZone].map[y].length; x++){
			if (zones[currentZone].map[y][x] == "t"){
				return 1;
			}
		}
	}
	return -1;
}

function completeTeleport(){
	for (let y = 0; y < zones[currentZone].map.length; y++){
		for (let x = 0; x < zones[currentZone].map[y].length; x++){
			if (zones[currentZone].map[y][x] == "t"){
				clones[currentClone].x = x - zones[currentZone].xOffset;
				clones[currentClone].y = y - zones[currentZone].yOffset;
			}
		}
	}
}

function startChargeDuplicate(completions){
	if (completions > 0){
		return 0;
	}
	let runes = 0;
	for (let y = 0; y < zones[currentZone].map.length; y++){
		runes += zones[currentZone].map[y].split(/[dD]/).length - 1;
	}
	return 2 ** (runes - 1);
}

function completeChargeRune(x, y){
	setMined(x, y, zones[currentZone].map[y + zones[currentZone].yOffset][x + zones[currentZone].xOffset].toLowerCase());
}

function tickWither(usedTime, {x, y}){
	x += zones[currentZone].xOffset;
	y += zones[currentZone].yOffset;
	let adjacentPlants = [
		"♣♠α§".includes(zones[currentZone].map[y-1][x]) ? zones[currentZone].mapLocations[y-1][x] : null,
		"♣♠α§".includes(zones[currentZone].map[y][x-1]) ? zones[currentZone].mapLocations[y][x-1] : null,
		"♣♠α§".includes(zones[currentZone].map[y+1][x]) ? zones[currentZone].mapLocations[y+1][x] : null,
		"♣♠α§".includes(zones[currentZone].map[y][x+1]) ? zones[currentZone].mapLocations[y][x+1] : null,
	].filter(p=>p);
	adjacentPlants.forEach(loc => {
		loc.wither += usedTime;
		if (loc.wither > loc.type.getEnterAction(loc.entered).start(true)){
			setMined(loc.x, loc.y, ".");
			loc.enterDuration = loc.remainingEnter = Math.min(baseWalkLength(), loc.remainingEnter);
			loc.entered = Infinity;
		}
	});
}

function completeWither(x, y){
	x += zones[currentZone].xOffset;
	y += zones[currentZone].yOffset;
	let adjacentPlants = [
		"♣♠α§".includes(zones[currentZone].map[y-1][x]) ? zones[currentZone].mapLocations[y-1][x] : null,
		"♣♠α§".includes(zones[currentZone].map[y][x-1]) ? zones[currentZone].mapLocations[y][x-1] : null,
		"♣♠α§".includes(zones[currentZone].map[y+1][x]) ? zones[currentZone].mapLocations[y+1][x] : null,
		"♣♠α§".includes(zones[currentZone].map[y][x+1]) ? zones[currentZone].mapLocations[y][x+1] : null,
	].filter(p=>p);
	if (!adjacentPlants.length) return false;
	return true;
}

function activatePortal(){
	moveToZone(currentZone + 1);
}

function completeGoal(x, y){
	zones[currentZone].completeGoal();
	completeMove(x, y);
}

function getChopTime(base, increaseRate){
	return () => base + increaseRate * queueTime * (currentRealm == 2 ? 5 : 1);
}

function tickSpore(usedTime){
	clones[currentClone].takeDamage(usedTime / 5000);
}

let actions = [
	new Action("Walk", 100, [["Speed", 1]], completeMove, startWalk, tickWalk),
	new Action("Mine", 1000, [["Mining", 1], ["Speed", 0.2]], completeMove),
	new Action("Mine Travertine", 10000, [["Mining", 1], ["Speed", 0.2]], completeMove),
	new Action("Mine Granite", 350000, [["Mining", 1], ["Speed", 0.2]], completeMove),
	new Action("Mine Basalt", 4000000, [["Mining", 1], ["Speed", 0.2]], completeMove),
	new Action("Mine Gold", 1000, [["Mining", 1], ["Speed", 0.2]], completeGoldMine),
	new Action("Mine Iron", 2500, [["Mining", 2]], completeIronMine),
	new Action("Mine Coal", 5000, [["Mining", 2]], completeCoalMine),
	new Action("Mine Salt", 50000, [["Mining", 1]], completeSaltMine),
	new Action("Collect Mana", 1000, [["Magic", 1]], completeCollectMana, startCollectMana, tickCollectMana),
	new Action("Create Clone", 1000, [], completeCreateClone, startCreateClone),
	new Action("Make Iron Bars", 5000, [["Smithing", 1]], simpleConvert([["Iron Ore", 1]], [["Iron Bar", 1]], true), simpleRequire([["Iron Ore", 1]], true)),
	new Action("Make Steel Bars", 15000, [["Smithing", 1]], simpleConvert([["Iron Bar", 1], ["Coal", 1]], [["Steel Bar", 1]], true), simpleRequire([["Iron Bar", 1], ["Coal", 1]], true)),
	new Action("Turn Gold to Mana", 1000, [["Magic", 1]], completeGoldMana, simpleRequire([["Gold Nugget", 1]], true)),
	new Action("Cross Pit", 3000, [["Smithing", 1], ["Speed", 0.3]], completeCrossPit, haveBridge),
	new Action("Cross Lava", 6000, [["Smithing", 1], ["Speed", 0.3]], completeCrossLava, haveBridge),
	new Action("Create Bridge", 5000, [["Smithing", 1]], simpleConvert([["Iron Bar", 2]], [["Iron Bridge", 1]]), simpleRequire([["Iron Bar", 2]])),
	new Action("Create Long Bridge", 50000, [["Smithing", 1]], simpleConvert([["Iron Bar", 2]], [["Iron Bridge", 1]]), simpleRequire([["Iron Bar", 2]])),
	new Action("Upgrade Bridge", 12500, [["Smithing", 1]], simpleConvert([["Steel Bar", 1], ["Iron Bridge", 1]], [["Steel Bridge", 1]]), simpleRequire([["Steel Bar", 1], ["Iron Bridge", 1]])),
	new Action("Read", 10000, [["Runic Lore", 2]], null),
	new Action("Create Sword", 7500, [["Smithing", 1]], simpleConvert([["Iron Bar", 3]], [["Iron Sword", 1]]), canMakeEquip([["Iron Bar", 3]], "Sword")),
	new Action("Upgrade Sword", 22500, [["Smithing", 1]], simpleConvert([["Steel Bar", 2], ["Iron Sword", 1]], [["Steel Sword", 1]]), simpleRequire([["Steel Bar", 2], ["Iron Sword", 1]])),
	new Action("Create Shield", 12500, [["Smithing", 1]], simpleConvert([["Iron Bar", 5]], [["Iron Shield", 1]]), canMakeEquip([["Iron Bar", 5]], "Shield")),
	new Action("Upgrade Shield", 27500, [["Smithing", 1]], simpleConvert([["Steel Bar", 2], ["Iron Shield", 1]], [["Steel Shield", 1]]), simpleRequire([["Steel Bar", 2], ["Iron Shield", 1]])),
	new Action("Create Armour", 10000, [["Smithing", 1]], simpleConvert([["Iron Bar", 4]], [["Iron Armour", 1]]), canMakeEquip([["Iron Bar", 4]], "Armour")),
	new Action("Upgrade Armour", 25000, [["Smithing", 1]], simpleConvert([["Steel Bar", 2], ["Iron Armour", 1]], [["Steel Armour", 1]]), simpleRequire([["Steel Bar", 2], ["Iron Armour", 1]])),
	new Action("Attack Creature", 1000, [["Combat", 1]], completeFight, null, tickFight, combatDuration),
	new Action("Teleport", 100, [["Runic Lore", 1]], completeTeleport, startTeleport),
	new Action("Charge Duplication", 50000, [["Runic Lore", 1]], completeChargeRune, startChargeDuplicate),
	new Action("Charge Wither", 100, [["Runic Lore", 1]], completeWither, null, tickWither),
	new Action("Charge Teleport", 50000, [["Runic Lore", 1]], completeChargeRune),
	new Action("Heal", 100, [["Runic Lore", 1]], completeHeal, null, tickHeal),
	new Action("Portal", 1, [["Magic", 0.5], ["Runic Lore", 0.5]], activatePortal),
	new Action("Complete Goal", 1000, [["Speed", 1]], completeGoal),
	new Action("Chop", getChopTime(1000, 0.1), [["Woodcutting", 1], ["Speed", 0.2]], completeMove),
	new Action("Kudzu Chop", getChopTime(1000, 0.1), [["Woodcutting", 1], ["Speed", 0.2]], completeMove, startWalk, tickWalk),
	new Action("Spore Chop", getChopTime(1000, 0.1), [["Woodcutting", 1], ["Speed", 0.2]], completeMove, null, tickSpore),
	new Action("Oyster Chop", getChopTime(1000, 0.2), [["Woodcutting", 1], ["Speed", 0.2]], completeMove),
	new Action("Create Axe", 2500, [["Smithing", 1]], simpleConvert([["Iron Bar", 1]], [["Iron Axe", 1]]), simpleRequire([["Iron Bar", 1]])),
	new Action("Create Pick", 2500, [["Smithing", 1]], simpleConvert([["Iron Bar", 1]], [["Iron Pick", 1]]), simpleRequire([["Iron Bar", 1]])),
	new Action("Create Hammer", 2500, [["Smithing", 1]], simpleConvert([["Iron Bar", 1]], [["Iron Hammer", 1]]), simpleRequire([["Iron Bar", 1]])),
];

function getAction(name) {
	return actions.find(a => a.name == name);
}

// General smithing costs:
// Iron: 2500/bar
// Steel: 7500/bar + cost of iron item
// Bar: Double base
