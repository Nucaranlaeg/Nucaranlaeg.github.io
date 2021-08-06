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

	getBaseDuration() {
		let duration = this.baseDuration / 1000;
		for (let i = 0; i < this.stats.length; i++) {
			duration *= Math.pow(this.stats[i][0].baseValue, this.stats[i][1]);
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
}

function completeMove(x, y){
	clones[currentClone].x = x;
	clones[currentClone].y = y;
	setMined(x, y);
}

function startWalk(){
	if (!clones[currentClone].walkTime) clones[currentClone].walkTime = this.getDuration();
}

function tickWalk(time){
	clones[currentClone].walkTime = Math.max(0, clones[currentClone].walkTime - time);
}

function getDuplicationAmount(x, y){
	let amount = 1;
	let rune_locs = [[x-1, y], [x+1, y], [x, y-1], [x, y+1]];
	for (let i = 0; i < rune_locs.length; i++){
		let location = getMapLocation(...rune_locs[i], true);
		if (location.temporaryPresent && location.temporaryPresent.name == "Charge Duplication"){
			amount += location.completions;
		}
	}
	return amount;
}

function completeGoldMine(x, y){
	getStuff("Gold Nugget").update(getDuplicationAmount(x, y));
	completeMove(x, y);
}

function completeIronMine(x, y){
	getStuff("Iron Ore").update(getDuplicationAmount(x, y));
	completeMove(x, y);
}

function completeCoalMine(x, y){
	getStuff("Coal").update(getDuplicationAmount(x, y));
	completeMove(x, y);
}

function completeCollectMana(x, y) {
	let location = getMapLocation(x, y);
	Route.updateBestRoute(location);
	zones[currentZone].mineComplete();
	setMined(x, y, ".");
}

function tickCollectMana(x, y) {
	let clone = clones[currentClone];
	let location = getMapLocation(clone.x, clone.y);
	Route.updateBestRoute(location);
}

function mineManaRockCost(completions, priorCompletions, zone) {
	return completions ? 0 : Math.pow(1.1 + 0.1 * zone.index, priorCompletions);
}

function startCollectMana(completions, priorCompletions) {
	return mineManaRockCost(completions, priorCompletions, zones[currentZone]);
}

function startCreateClone(completions, priorCompletions){
	let gold = getStuff("Gold Nugget");
	let needed = getNextCloneAmount(completions + priorCompletions);
	return gold.count >= needed ? 1 : -1;
}

function completeCreateClone(x, y){
	Clone.addNewClone();
}

function getNextCloneAmount(){
	return clones.length == 1 ? 1 : 5 * Math.pow(2, clones.length - 1);
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

function canMakeEquip(requirement, equipType){
	function canDo(){
		let haveStuff = simpleRequire(requirement)();
		if (!haveStuff) return haveStuff;
		let itemCount = stuff.reduce((a, c) => a + (c.name.includes(equipType) ? c.count : 0), 0);
		if (itemCount >= clones.length) return 0;
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
	let attack = getStat("Attack").current;
	if (creature.health){
		if (creature.defense >= attack && creature.attack <= getStat("Defense").current){
			creature.health = Math.max(creature.health - 1, 0);
		}
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
			if (zones[currentZone].map[y][x] == "T"){
				return 1;
			}
		}
	}
	return -1;
}

function completeTeleport(){
	for (let y = 0; y < zones[currentZone].map.length; y++){
		for (let x = 0; x < zones[currentZone].map[y].length; x++){
			if (zones[currentZone].map[y][x] == "T"){
				clones[currentClone].x = x - zones[currentZone].xOffset;
				clones[currentClone].y = y - zones[currentZone].yOffset;
			}
		}
	}
}

function startChargeRune(completions){
	if (completions > 0){
		return 0;
	}
	let runes = 0;
	for (let y = 0; y < zones[currentZone].map.length; y++){
		runes += zones[currentZone].map[y].split(/[dD]/).length - 1;
	}
	return runes;
}

function completeChargeRune(x, y){
	setMined(x, y, zones[currentZone].map[y + zones[currentZone].yOffset][x + zones[currentZone].xOffset].toLowerCase());
}

function activatePortal(){
	moveToZone(currentZone + 1);
}

function completeChallenge(x, y){
	zones[currentZone].completeChallenge();
	completeMove(x, y);
}

let actions = [
	new Action("Walk", 100, [["Speed", 1]], completeMove, startWalk, tickWalk),
	new Action("Mine", 1000, [["Mining", 1], ["Speed", 0.2]], completeMove),
	new Action("Mine Granite", 10000, [["Mining", 1], ["Speed", 0.2]], completeMove),
	new Action("Mine Gold", 1000, [["Mining", 1], ["Speed", 0.2]], completeGoldMine),
	new Action("Mine Iron", 2500, [["Mining", 2]], completeIronMine),
	new Action("Mine Coal", 5000, [["Mining", 2]], completeCoalMine),
	new Action("Collect Mana", 1000, [["Magic", 1]], completeCollectMana, startCollectMana, tickCollectMana),
	new Action("Create Clone", 1000, [], completeCreateClone, startCreateClone),
	new Action("Make Iron Bars", 5000, [["Smithing", 1]], simpleConvert([["Iron Ore", 1]], [["Iron Bar", 1]]), simpleRequire([["Iron Ore", 1]])),
	new Action("Make Steel Bars", 15000, [["Smithing", 1]], simpleConvert([["Iron Bar", 1], ["Coal", 1]], [["Steel Bar", 1]]), simpleRequire([["Iron Bar", 1], ["Coal", 1]])),
	new Action("Turn Gold to Mana", 1000, [["Magic", 1]], completeGoldMana, simpleRequire([["Gold Nugget", 1]])),
	new Action("Cross Pit", 3000, [["Smithing", 1], ["Speed", 0.3]], completeCrossPit, haveBridge),
	new Action("Cross Lava", 6000, [["Smithing", 1], ["Speed", 0.3]], completeCrossLava, haveBridge),
	new Action("Create Bridge", 5000, [["Smithing", 1]], simpleConvert([["Iron Bar", 2]], [["Iron Bridge", 1]]), simpleRequire([["Iron Bar", 2]])),
	new Action("Upgrade Bridge", 12500, [["Smithing", 1]], simpleConvert([["Steel Bar", 1], ["Iron Bridge", 1]], [["Steel Bridge", 1]]), simpleRequire([["Steel Bar", 1], ["Iron Bridge", 1]])),
	new Action("Read", 10000, [["Runic Lore", 2]], null),
	new Action("Create Sword", 7500, [["Smithing", 1]], simpleConvert([["Iron Bar", 3]], [["Iron Sword", 1]]), canMakeEquip([["Iron Bar", 3]], "Sword")),
	new Action("Upgrade Sword", 22500, [["Smithing", 1]], simpleConvert([["Steel Bar", 2], ["Iron Sword", 1]], [["Steel Sword", 1]]), simpleRequire([["Steel Bar", 2], ["Iron Sword", 1]])),
	new Action("Create Shield", 12500, [["Smithing", 1]], simpleConvert([["Iron Bar", 5]], [["Iron Shield", 1]]), canMakeEquip([["Iron Bar", 5]], "Shield")),
	new Action("Upgrade Shield", 27500, [["Smithing", 1]], simpleConvert([["Steel Bar", 2], ["Iron Shield", 1]], [["Steel Shield", 1]]), simpleRequire([["Steel Bar", 2], ["Iron Shield", 1]])),
	new Action("Create Armour", 10000, [["Smithing", 1]], simpleConvert([["Iron Bar", 4]], [["Iron Armour", 1]]), canMakeEquip([["Iron Bar", 4]], "Armour")),
	new Action("Upgrade Armour", 25000, [["Smithing", 1]], simpleConvert([["Steel Bar", 2], ["Iron Armour", 1]], [["Steel Armour", 1]]), simpleRequire([["Steel Bar", 2], ["Iron Armour", 1]])),
	new Action("Attack Creature", 1000, [["Combat", 1]], completeFight, null, tickFight),
	new Action("Teleport", 1000, [["Runic Lore", 1]], completeTeleport, startTeleport),
	new Action("Charge Duplication", 50000, [["Runic Lore", 1]], completeChargeRune, startChargeRune),
	new Action("Heal", 100, [["Runic Lore", 1]], completeHeal, null, tickHeal),
	new Action("Portal", 1, [["Magic", 0.5], ["Runic Lore", 0.5]], activatePortal),
	new Action("Complete Challenge", 1000, [["Speed", 1]], completeChallenge),
];

function getAction(name) {
	return actions.find(a => a.name == name);
}

// General smithing costs:
// Iron: 2500/bar
// Steel: 7500/bar + cost of iron item
// Bar: Double base
