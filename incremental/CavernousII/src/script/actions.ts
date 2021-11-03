type statList = [Stat<anyStatName>, number][];

class Action<actionName extends anyActionName = anyActionName> {
	name: actionName;
	baseDuration: number | (() => number);
	stats: statList;
	complete: (x: number, y: number, creature?: Creature | null) => boolean | void;
	canStart: ({(spend?: boolean): CanStartReturnCode; itemCount: number;}) | ((location: MapLocation) => CanStartReturnCode) | null;
	tickExtra: this["tick"] | null;
	specialDuration: (location: MapLocation) => number;

	constructor(
		name: actionName,
		baseDuration: number | (() => number),
		stats: [anyStatName, number][],
		complete: (x: number, y: number, creature?: Creature | null) => boolean | void,
		canStart: Action["canStart"] = null,
		tickExtra: Action["tick"] | null = null,
		specialDuration: Action["specialDuration"] = () => 1
	) {
		this.name = name;
		this.baseDuration = baseDuration;
		this.stats = stats.map(s => [getStat(s[0]), s[1]]);
		this.complete = complete || (() => {});
		this.canStart = canStart;
		this.tickExtra = tickExtra;
		this.specialDuration = specialDuration;
	}

	start(location: MapLocation) {
		if (this.canStart) {
			// Typescript can't read its own function types.
			// @ts-ignore
			let canStart = <number>this.canStart(location);
			if (canStart <= 0) return canStart;
		}
		return this.getDuration(location);
	}

	tick(usedTime: number, creature: Creature | null = null, baseTime: number = 0) {
		for (let i = 0; i < this.stats.length; i++) {
			this.stats[i][0].gainSkill((baseTime / 1000) * this.stats[i][1]);
		}
		if (this.tickExtra) {
			this.tickExtra(usedTime, creature, baseTime);
		}
	}

	getDuration(location: MapLocation) {
		let duration = (typeof this.baseDuration == "function" ? this.baseDuration() : this.baseDuration) * this.specialDuration(location);
		if (realms[currentRealm].name == "Long Realm") {
			duration *= 3;
		} else if (realms[currentRealm].name == "Compounding Realm") {
			duration *= 1 + loopCompletions / 40;
		}
		return duration;
	}

	getBaseDuration(realm: number = currentRealm) {
		let duration = (typeof this.baseDuration == "function" ? this.baseDuration() : this.baseDuration) / 1000;
		for (let i = 0; i < this.stats.length; i++) {
			duration *= Math.pow(this.stats[i][0].baseValue, this.stats[i][1]);
		}
		if (realms[realm].name == "Long Realm") {
			duration *= 3;
		} else if (realms[realm].name == "Compounding Realm") {
			duration *= 1 + loopCompletions / 40;
		}
		return duration;
	}

	getProjectedDuration(location: MapLocation, applyWither = 0, useDuration = 0) {
		let duration;
		if (useDuration > 0) {
			duration = useDuration;
		} else {
			duration = (typeof this.baseDuration == "function" ? this.baseDuration() : this.baseDuration) * this.specialDuration(location);
			duration -= applyWither;
		}
		duration *= this.getSkillDiv();
		if (realms[currentRealm].name == "Long Realm") {
			duration *= 3;
		} else if (realms[currentRealm].name == "Compounding Realm") {
			duration *= 1 + loopCompletions / 40;
		}
		return duration;
	}

	increaseStat(stat: anyStatName, amount: number) {
		const index = this.stats.findIndex(s => s[0].name == stat);
		if (index == -1) {
			this.stats.push([getStat(stat), amount]);
		} else {
			this.stats[index][1] += amount;
		}
	}

	getSkillDiv() {
		let mult = 1;
		for (let i = 0; i < this.stats.length; i++) {
			mult *= Math.pow(this.stats[i][0].value, this.stats[i][1]);
		}
		return mult;
	}
}

function baseWalkLength() {
	return 100 * (realms[currentRealm].name == "Long Realm" ? 3 : 1);
}

function completeMove(x: number, y: number) {
	clones[currentClone].x = x;
	clones[currentClone].y = y;
	setMined(x, y);
}

function startWalk(this: Action): CanStartReturnCode {
	//giving getduration dummylocation because an actual location isnt available
	if (!clones[currentClone].walkTime) clones[currentClone].walkTime = this.getDuration(new MapLocation(0, 0, zones[0], "Tunnel"));
	return CanStartReturnCode.Now;
}

function tickWalk(time: number) {
	clones[currentClone].walkTime = Math.max(0, clones[currentClone].walkTime - time);
}

function getDuplicationAmount(x: number, y: number) {
	let amount = 1;
	const zone = zones[currentZone];
	x += zone.xOffset;
	y += zone.yOffset;
	const rune_locs = [
		[x - 1, y],
		[x + 1, y],
		[x, y - 1],
		[x, y + 1],
		[x - 1, y + 1],
		[x + 1, y + 1],
		[x + 1, y - 1],
		[x - 1, y - 1]
	];
	rune_locs.forEach(([X, Y]) => {
		amount += +(zone.map[Y][X] == "d") * (getRune("Duplication").upgradeCount * 0.25 + 1);
	});
	return amount;
}

function completeGoldMine(x: number, y: number) {
	const gold = getStuff("Gold Nugget");
	gold.update(getDuplicationAmount(x, y));
	if (gold.count >= 5) getMessage("Mass Manufacturing").display();
	completeMove(x, y);
}

function completeIronMine(x: number, y: number) {
	const iron = getStuff("Iron Ore");
	iron.update(getDuplicationAmount(x, y));
	completeMove(x, y);
}

function completeCoalMine(x: number, y: number) {
	getStuff("Coal").update(getDuplicationAmount(x, y));
	completeMove(x, y);
}

function completeSaltMine(x: number, y: number) {
	getStuff("Salt").update(getDuplicationAmount(x, y));
	completeMove(x, y);
}

function completeCollectMana(x: number, y: number) {
	const location = getMapLocation(x, y);
	if (location === null) throw new Error("Location not found");
	Route.updateBestRoute(location);
	zones[currentZone].mineComplete();
	setMined(x, y, ".");
	if (settings.autoRestart == 1 && settings.grindMana) shouldReset = true;
}

function tickCollectMana() {
	const clone = clones[currentClone];
	const location = getMapLocation(clone.x, clone.y);
	if (location === null) throw new Error("Location not found");
	Route.updateBestRoute(location);
}

function longZoneCompletionMult(x: number, y: number, z: number) {
	if (x === undefined || y === undefined) return 1;
	const location = zones[z].getMapLocation(x, y);
	if (location === null) throw new Error("Location not found");
	return 0.99 ** (location.priorCompletionData[1] ** 0.75);
}

function mineManaRockCost(location: MapLocation, realm:number | null = null, completionOveride?: number) {
	return location.completions
		? 0
		: Math.pow(1 + (0.1 + 0.05 * (location.zone.index + (realm == null ? currentRealm : realm))) * longZoneCompletionMult(location.x, location.y, location.zone.index), completionOveride ?? location.priorCompletions);
}

function startCollectMana() {
	return CanStartReturnCode.Now;
}

function mineGemCost(location: MapLocation){
	return (location.completions + 1) ** 1.4
}

function startCollectGem() {
	return CanStartReturnCode.Now
}

function completeCollectGem(x: number, y: number) {
	getStuff("Gem").update(getDuplicationAmount(x, y));
}

function startActivateMachine(): CanStartReturnCode {
	const gold = getStuff("Gold Nugget");
	const needed = realms[currentRealm].getNextActivateAmount();
	return gold.count >= needed ? CanStartReturnCode.Now : CanStartReturnCode.NotNow;
}

function completeActivateMachine(x: number, y: number) {
	const gold = getStuff("Gold Nugget");
	const needed = realms[currentRealm].getNextActivateAmount();
	gold.update(-needed);
	realms[currentRealm].activateMachine();
}

function simpleConvert(source: [anyStuffName, number][], target: [anyStuffName, number][], doubleExcempt = false) {
	function convert() {
		const mult = realms[currentRealm].name == "Long Realm" && !doubleExcempt ? 2 : 1;
		for (let i = 0; i < source.length; i++) {
			const stuff = getStuff(source[i][0]);
			if (stuff.count < source[i][1] * (source[i][0].match(/Armour|Sword|Shield/) ? 1 : mult)) return;
		}
		for (let i = 0; i < source.length; i++) {
			const stuff = getStuff(source[i][0]);
			stuff.update(-source[i][1] * (source[i][0].match(/Armour|Sword|Shield/) ? 1 : mult));
		}
		for (let i = 0; i < target.length; i++) {
			const stuff = getStuff(target[i][0]);
			stuff.update(target[i][1]);
		}
	}
	return convert;
}

function simpleRequire(requirement: [anyStuffName, number][], doubleExcempt = false) {
	function haveEnough(spend: boolean = false): CanStartReturnCode {
		const mult = realms[currentRealm].name == "Long Realm" && !doubleExcempt ? 2 : 1;
		for (let i = 0; i < requirement.length; i++) {
			const stuff = getStuff(requirement[i][0]);
			if (stuff.count < requirement[i][1] * (requirement[i][0].match(/Armour|Sword|Shield/) ? 1 : mult)) return CanStartReturnCode.NotNow;
			// In other functions it's (x, y, creature), so just check that it's exactly true
			// spend is used for placing runes.
			if (spend === true) stuff.update(-requirement[i][1] * (requirement[i][0].match(/Armour|Sword|Shield/) ? 1 : mult));
		}
		return CanStartReturnCode.Now;
	}
	haveEnough.itemCount = requirement.reduce((a, c) => a + c[1], 0);
	return haveEnough;
}

function canMakeEquip(requirement: [anyStuffName, number][], equipType: string) {
	function canDo(): CanStartReturnCode {
		const haveStuff = simpleRequire(requirement)();
		if (haveStuff <= 0) return haveStuff;
		const itemCount = stuff.reduce((a, c) => a + (c.name.includes(equipType) ? c.count : 0), 0);
		if (itemCount >= clones.length) return CanStartReturnCode.Never;
		return CanStartReturnCode.Now;
	}
	return canDo;
}

function haveBridge(): CanStartReturnCode {
	if (getStuff("Iron Bridge").count || getStuff("Steel Bridge").count) return CanStartReturnCode.Now;
	return CanStartReturnCode.NotNow;
}

function completeGoldMana() {
	const gold = getStuff("Gold Nugget");
	if (gold.count < 1) return true;
	gold.update(-1);
	const manaMult = getRealmMult("Verdant Realm") || 1;
	getStat("Mana").current += 5 * manaMult;
	return false;
}

function completeCrossPit(x: number, y: number) {
	let bridge: Stuff<"Iron Bridge" | "Steel Bridge"> = getStuff("Iron Bridge");
	if (bridge.count < 1) {
		bridge = getStuff("Steel Bridge");
		if (bridge.count < 1 || !settings.useDifferentBridges) return true;
	}
	bridge.update(-1);
	completeMove(x, y);
	return false;
}

function completeCrossLava(x: number, y: number) {
	let bridge: Stuff<"Iron Bridge" | "Steel Bridge"> = getStuff("Steel Bridge");
	if (bridge.count < 1) {
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
	getMapLocation(x, y)!.entered = Infinity;
	return false;
}

function tickFight(usedTime: number, creature: Creature, baseTime: number) {
	let damage = (Math.max(creature.attack - getStat("Defense").current, 0) * baseTime) / 1000;
	if (creature.defense >= getStat("Attack").current && creature.attack <= getStat("Defense").current) {
		damage = baseTime / 1000;
	}
	const targetClones = clones.filter(c => c.x == clones[currentClone].x && c.y == clones[currentClone].y);
	targetClones.forEach(c => c.takeDamage(damage / targetClones.length));
}


let combatTools: [Stuff<anyStuffName>, number, Stat<anyStatName>][] = [
	[getStuff("Iron Axe"), 0.01, getStat("Woodcutting")],
	[getStuff("Iron Pick"), 0.01, getStat("Mining")],
	[getStuff("Iron Hammer"), 0.01, getStat("Smithing")]
];

function combatDuration() {
	let duration = 1;
	for (let i = 0; i < combatTools.length; i++) {
		duration *= Math.pow(combatTools[i][2].value, combatTools[i][1] * combatTools[i][0].count);
	}
	return duration;
}

function completeFight(x: number, y: number, creature: Creature | null | undefined) {
	const attack = getStat("Attack").current;
	if (creature!.health) {
		creature!.health = Math.max(creature!.health - Math.max(attack - creature!.defense, 0) * (clones[currentClone].activeSpells.find(spell => spell.name == "Mystic Blade") ? 2 : 1), 0);
		creature!.drawHealth();
	}
	if (!creature!.health) {
		clones.forEach(c => {
			if ((Math.abs(c.x - x) <= 1) || (Math.abs(c.y - y) <= 1)) {
				c.activeSpells = c.activeSpells.filter(s => !s.endOnCombat);
			}
		});
		return completeMove(x, y);
	}
	return true;
}

function tickHeal(usedTime: number) {
	clones[currentClone].takeDamage(-usedTime / 1000);
}

function completeHeal() {
	return clones[currentClone].damage > 0;
}

function predictHeal() {
	return clones[currentClone].damage * getStat("Runic Lore").value;
}

function startChargeTeleport() {
	for (let y = 0; y < zones[currentZone].map.length; y++) {
		for (let x = 0; x < zones[currentZone].map[y].length; x++) {
			if (zones[currentZone].map[y][x] == "t") {
				return CanStartReturnCode.Never;
			}
		}
	}
	return CanStartReturnCode.Now;
}

function startTeleport(): CanStartReturnCode {
	for (let y = 0; y < zones[currentZone].map.length; y++) {
		for (let x = 0; x < zones[currentZone].map[y].length; x++) {
			if (zones[currentZone].map[y][x] == "t") {
				return CanStartReturnCode.Now;
			}
		}
	}
	return CanStartReturnCode.NotNow;
}

function completeTeleport() {
	for (let y = 0; y < zones[currentZone].map.length; y++) {
		for (let x = 0; x < zones[currentZone].map[y].length; x++) {
			if (zones[currentZone].map[y][x] == "t") {
				clones[currentClone].x = x - zones[currentZone].xOffset;
				clones[currentClone].y = y - zones[currentZone].yOffset;
				return;
			}
		}
	}
}

function predictTeleport(){
	for (let y = 0; y < zones[currentZone].map.length; y++){
		for (let x = 0; x < zones[currentZone].map[y].length; x++){
			if (zones[currentZone].map[y][x] == "t"){
				return 1;
			}
		}
	}
	return Infinity;
}

function startChargeDuplicate(location: MapLocation) {
	if (location.completions > 0) {
		return 0;
	}
	return 1;
}

function duplicateDuration() {
	let runes = 0;
	for (let y = 0; y < zones[currentZone].map.length; y++) {
		runes += zones[currentZone].map[y].split(/[dD]/).length - 1;
	}
	return 2 ** (runes - 1);
}

function completeChargeRune(x: number, y: number) {
	setMined(x, y, zones[currentZone].map[y + zones[currentZone].yOffset][x + zones[currentZone].xOffset].toLowerCase());
}

function tickWither(usedTime: number, { x, y }:Creature) {
	x += zones[currentZone].xOffset;
	y += zones[currentZone].yOffset;
	const wither = getRune("Wither");
	const adjacentPlants = [
		"♣♠α§".includes(zones[currentZone].map[y - 1][x]) ? zones[currentZone].mapLocations[y - 1][x] : null,
		"♣♠α§".includes(zones[currentZone].map[y][x - 1]) ? zones[currentZone].mapLocations[y][x - 1] : null,
		"♣♠α§".includes(zones[currentZone].map[y + 1][x]) ? zones[currentZone].mapLocations[y + 1][x] : null,
		"♣♠α§".includes(zones[currentZone].map[y][x + 1]) ? zones[currentZone].mapLocations[y][x + 1] : null
	].filter((p): p is NonNullable<typeof p> => p !== null);
	if (wither.upgradeCount > 0) {
		adjacentPlants.push(
			...[
				"♣♠α§".includes(zones[currentZone].map[y - 1][x - 1]) ? zones[currentZone].mapLocations[y - 1][x - 1] : null,
				"♣♠α§".includes(zones[currentZone].map[y + 1][x - 1]) ? zones[currentZone].mapLocations[y + 1][x - 1] : null,
				"♣♠α§".includes(zones[currentZone].map[y + 1][x + 1]) ? zones[currentZone].mapLocations[y + 1][x + 1] : null,
				"♣♠α§".includes(zones[currentZone].map[y - 1][x + 1]) ? zones[currentZone].mapLocations[y - 1][x + 1] : null
			].filter((p): p is NonNullable<typeof p> => p !== null)
		);
	}
	adjacentPlants.forEach(loc => {
		loc.wither += usedTime * (wither.upgradeCount ? 2 ** (wither.upgradeCount - 1) : 1);
		if (loc.type.getEnterAction(loc.entered).getProjectedDuration(loc, loc.wither) <= 0) {
			setMined(loc.x, loc.y, ".");
			loc.enterDuration = loc.remainingEnter = Math.min(baseWalkLength(), loc.remainingEnter);
			loc.entered = Infinity;
		}
	});
}

function completeWither(x: number, y: number) {
	x += zones[currentZone].xOffset;
	y += zones[currentZone].yOffset;
	const adjacentPlants = [
		"♣♠α§".includes(zones[currentZone].map[y - 1][x]) ? zones[currentZone].mapLocations[y - 1][x] : null,
		"♣♠α§".includes(zones[currentZone].map[y][x - 1]) ? zones[currentZone].mapLocations[y][x - 1] : null,
		"♣♠α§".includes(zones[currentZone].map[y + 1][x]) ? zones[currentZone].mapLocations[y + 1][x] : null,
		"♣♠α§".includes(zones[currentZone].map[y][x + 1]) ? zones[currentZone].mapLocations[y][x + 1] : null
	].filter(p => p);
	if (getRune("Wither").upgradeCount > 0) {
		adjacentPlants.push(
			...[
				"♣♠α§".includes(zones[currentZone].map[y - 1][x - 1]) ? zones[currentZone].mapLocations[y - 1][x - 1] : null,
				"♣♠α§".includes(zones[currentZone].map[y + 1][x - 1]) ? zones[currentZone].mapLocations[y + 1][x - 1] : null,
				"♣♠α§".includes(zones[currentZone].map[y + 1][x + 1]) ? zones[currentZone].mapLocations[y + 1][x + 1] : null,
				"♣♠α§".includes(zones[currentZone].map[y - 1][x + 1]) ? zones[currentZone].mapLocations[y - 1][x + 1] : null
			].filter(p => p)
		);
	}
	if (!adjacentPlants.length) return false;
	return true;
}

function predictWither(location: MapLocation) {
	let x = location.x;
	let y = location.y;
	if (x === null || y === null) return 1;
	x += zones[currentZone].xOffset;
	y += zones[currentZone].yOffset;
	const wither = getRune("Wither");
	const adjacentPlants = [
		"♣♠α§".includes(zones[currentZone].map[y - 1][x]) ? zones[currentZone].mapLocations[y - 1][x] : null,
		"♣♠α§".includes(zones[currentZone].map[y][x - 1]) ? zones[currentZone].mapLocations[y][x - 1] : null,
		"♣♠α§".includes(zones[currentZone].map[y + 1][x]) ? zones[currentZone].mapLocations[y + 1][x] : null,
		"♣♠α§".includes(zones[currentZone].map[y][x + 1]) ? zones[currentZone].mapLocations[y][x + 1] : null
	].filter((p): p is NonNullable<typeof p> => p !== null);
	if (wither.upgradeCount > 0) {
		adjacentPlants.push(
			...[
				"♣♠α§".includes(zones[currentZone].map[y - 1][x - 1]) ? zones[currentZone].mapLocations[y - 1][x - 1] : null,
				"♣♠α§".includes(zones[currentZone].map[y + 1][x - 1]) ? zones[currentZone].mapLocations[y + 1][x - 1] : null,
				"♣♠α§".includes(zones[currentZone].map[y + 1][x + 1]) ? zones[currentZone].mapLocations[y + 1][x + 1] : null,
				"♣♠α§".includes(zones[currentZone].map[y - 1][x + 1]) ? zones[currentZone].mapLocations[y - 1][x + 1] : null
			].filter((p): p is NonNullable<typeof p> => p !== null)
		);
	}
	if (!adjacentPlants.length) return 0;
	return Math.max(...adjacentPlants.map(loc => loc.type.getEnterAction(loc.entered).getProjectedDuration(loc, loc.wither))) / 2000;
}

function activatePortal() {
	moveToZone(currentZone + 1);
}

function completeGoal(x: number, y: number) {
	zones[currentZone].completeGoal();
	completeMove(x, y);
}

function getChopTime(base: number, increaseRate: number) {
	return () => base + increaseRate * queueTime * (realms[currentRealm].name == "Verdant Realm" ? 5 : 1);
}

function tickSpore(usedTime: number, creature: Creature, baseTime: number) {
	clones[currentClone].takeDamage(baseTime / 1000);
}

function completeBarrier(x: number, y: number) {
	zones[currentZone].manaDrain += 5;
	completeMove(x, y);
}

function startBarrier(location: MapLocation) {
	location = getMapLocation(location.x, location.y, true)!;
	if (getRealm("Compounding Realm").machineCompletions >= +location.baseType.symbol) return CanStartReturnCode.Now;
	return CanStartReturnCode.Never;
}

enum ACTION {
	WALK = "Walk",
	WAIT = "Wait",
	MINE = "Mine",
	MINE_TRAVERTINE = "Mine Travertine",
	MINE_GRANITE = "Mine Granite",
	MINE_BASALT = "Mine Basalt",
	MINE_GOLD = "Mine Gold",
	MINE_IRON = "Mine Iron",
	MINE_COAL = "Mine Coal",
	MINE_SALT = "Mine Salt",
	MINE_GEM = "Mine Gem",
	COLLECT_GEM = "Collect Gem",
	COLLECT_MANA = "Collect Mana",
	ACTIVATE_MACHINE = "Activate Machine",
	MAKE_IRON_BARS = "Make Iron Bars",
	MAKE_STEEL_BARS = "Make Steel Bars",
	TURN_GOLD_TO = "Turn Gold to Mana",
	CROSS_PIT = "Cross Pit",
	CROSS_LAVA = "Cross Lava",
	CREATE_BRIDGE = "Create Bridge",
	CREATE_LONG_BRIDGE = "Create Long Bridge",
	UPGRADE_BRIDGE = "Upgrade Bridge",
	READ = "Read",
	CREATE_SWORD = "Create Sword",
	UPGRADE_SWORD = "Upgrade Sword",
	ENCHANT_SWORD = "Enchant Sword",
	CREATE_SHIELD = "Create Shield",
	UPGRADE_SHIELD = "Upgrade Shield",
	ENCHANT_SHIELD = "Enchant Shield",
	CREATE_ARMOUR = "Create Armour",
	UPGRADE_ARMOUR = "Upgrade Armour",
	ENCHANT_ARMOUR = "Enchant Armour",
	ATTACK_CREATURE = "Attack Creature",
	TELEPORT = "Teleport",
	CHARGE_DUPLICATION = "Charge Duplication",
	CHARGE_WITHER = "Charge Wither",
	CHARGE_TELEPORT = "Charge Teleport",
	HEAL = "Heal",
	PORTAL = "Portal",
	COMPLETE_GOAL = "Complete Goal",
	CHOP = "Chop",
	CHOP_KUDZU = "Kudzu Chop",
	CHOP_SPORE = "Spore Chop",
	CHOP_OYSTER = "Oyster Chop",
	CREATE_AXE = "Create Axe",
	CREATE_PICK = "Create Pick",
	CREATE_HAMMER = "Create Hammer",
	ENTER_BARRIER = "Enter Barrier",
}

type anyActionName = `${ACTION}`
type anyAction = Action<anyActionName>;
const actions: anyAction[] = [
	new Action("Walk", 100, [["Speed", 1]], completeMove, startWalk, tickWalk),
	new Action("Wait", 100, [], () => {}, startWalk, tickWalk),
	new Action("Mine", 1000, [["Mining", 1], ["Speed", 0.2]], completeMove),
	new Action("Mine Travertine", 10000, [["Mining", 1], ["Speed", 0.2]], completeMove),
	new Action("Mine Granite", 350000, [["Mining", 1], ["Speed", 0.2]], completeMove),
	new Action("Mine Basalt", 4000000, [["Mining", 1], ["Speed", 0.2]], completeMove),
	new Action("Mine Gold", 1000, [["Mining", 1], ["Speed", 0.2]], completeGoldMine),
	new Action("Mine Iron", 2500, [["Mining", 2]], completeIronMine),
	new Action("Mine Coal", 5000, [["Mining", 2]], completeCoalMine),
	new Action("Mine Salt", 50000, [["Mining", 1]], completeSaltMine),
	new Action("Mine Gem", 100000, [["Mining", 0.75], ["Gemcraft", 0.25]], completeMove),
	new Action("Collect Gem", 100000, [["Smithing", 0.1], ["Gemcraft", 1]], completeCollectGem, startCollectGem, null, mineGemCost),
	new Action("Collect Mana", 1000, [["Magic", 1]], completeCollectMana, startCollectMana, tickCollectMana, mineManaRockCost),
	new Action("Activate Machine", 1000, [], completeActivateMachine, startActivateMachine),
	new Action("Make Iron Bars", 5000, [["Smithing", 1]], simpleConvert([["Iron Ore", 1]], [["Iron Bar", 1]], true), simpleRequire([["Iron Ore", 1]], true)),
	new Action("Make Steel Bars", 15000, [["Smithing", 1]], simpleConvert([["Iron Bar", 1], ["Coal", 1]], [["Steel Bar", 1]]), simpleRequire([["Iron Bar", 1], ["Coal", 1]])),
	new Action("Turn Gold to Mana", 1000, [["Magic", 1]], completeGoldMana, simpleRequire([["Gold Nugget", 1]], true)),
	new Action("Cross Pit", 3000, [["Smithing", 1], ["Speed", 0.3]], completeCrossPit, haveBridge),
	new Action("Cross Lava", 6000, [["Smithing", 1], ["Speed", 0.3]], completeCrossLava, haveBridge),
	new Action("Create Bridge", 5000, [["Smithing", 1]], simpleConvert([["Iron Bar", 2]], [["Iron Bridge", 1]]), simpleRequire([["Iron Bar", 2]])),
	new Action("Create Long Bridge", 50000, [["Smithing", 1]], simpleConvert([["Iron Bar", 2]], [["Iron Bridge", 1]]), simpleRequire([["Iron Bar", 2]])),
	new Action("Upgrade Bridge", 12500, [["Smithing", 1]], simpleConvert([["Steel Bar", 1], ["Iron Bridge", 1]], [["Steel Bridge", 1]]), simpleRequire([["Steel Bar", 1], ["Iron Bridge", 1]])),
	new Action("Create Sword", 7500, [["Smithing", 1]], simpleConvert([["Iron Bar", 3]], [["Iron Sword", 1]]), canMakeEquip([["Iron Bar", 3]], "Sword")),
	new Action("Upgrade Sword", 22500, [["Smithing", 1]], simpleConvert([["Steel Bar", 2], ["Iron Sword", 1]], [["Steel Sword", 1]]), simpleRequire([["Steel Bar", 2], ["Iron Sword", 1]])),
	new Action("Enchant Sword", 3000000, [["Smithing", 0.5], ["Gemcraft", 0.5]], simpleConvert([["Gem", 3], ["Steel Sword", 1]], [["+1 Sword", 1]]), simpleRequire([["Gem", 3], ["Steel Sword", 1]])),
	new Action("Create Shield", 12500, [["Smithing", 1]], simpleConvert([["Iron Bar", 5]], [["Iron Shield", 1]]), canMakeEquip([["Iron Bar", 5]], "Shield")),
	new Action("Upgrade Shield", 27500, [["Smithing", 1]], simpleConvert([["Steel Bar", 2], ["Iron Shield", 1]], [["Steel Shield", 1]]), simpleRequire([["Steel Bar", 2], ["Iron Shield", 1]])),
	new Action("Enchant Shield", 3000000, [["Smithing", 0.5], ["Gemcraft", 0.5]], simpleConvert([["Gem", 3], ["Steel Shield", 1]], [["+1 Shield", 1]]), simpleRequire([["Gem", 3], ["Steel Shield", 1]])),
	new Action("Create Armour", 10000, [["Smithing", 1]], simpleConvert([["Iron Bar", 4]], [["Iron Armour", 1]]), canMakeEquip([["Iron Bar", 4]], "Armour")),
	new Action("Upgrade Armour", 25000, [["Smithing", 1]], simpleConvert([["Steel Bar", 2], ["Iron Armour", 1]], [["Steel Armour", 1]]), simpleRequire([["Steel Bar", 2], ["Iron Armour", 1]])),
	new Action("Enchant Armour", 3000000, [["Smithing", 0.5], ["Gemcraft", 0.5]], simpleConvert([["Gem", 3], ["Steel Armour", 1]], [["+1 Armour", 1]]), simpleRequire([["Gem", 3], ["Steel Armour", 1]])),
	new Action("Attack Creature", 1000, [["Combat", 1]], completeFight, null, tickFight, combatDuration),
	new Action("Teleport", 1, [["Runic Lore", 1]], completeTeleport, startTeleport, null, predictTeleport),
	new Action("Charge Duplication", 50000, [["Runic Lore", 1]], completeChargeRune, startChargeDuplicate, null, duplicateDuration),
	new Action("Charge Wither", 1000, [["Runic Lore", 1]], completeWither, null, tickWither, predictWither),
	new Action("Charge Teleport", 50000, [["Runic Lore", 1]], completeChargeRune, startChargeTeleport),
	new Action("Heal", 1000, [["Runic Lore", 1]], completeHeal, null, tickHeal, predictHeal),
	new Action("Portal", 1, [["Magic", 0.5], ["Runic Lore", 0.5]], activatePortal),
	new Action("Complete Goal", 1000, [["Speed", 1]], completeGoal),
	new Action("Chop", getChopTime(1000, 0.1), [["Woodcutting", 1], ["Speed", 0.2]], completeMove),
	new Action("Kudzu Chop", getChopTime(1000, 0.1), [["Woodcutting", 1], ["Speed", 0.2]], completeMove, startWalk, tickWalk),
	new Action("Spore Chop", getChopTime(1000, 0.1), [["Woodcutting", 1], ["Speed", 0.2]], completeMove, null, tickSpore),
	new Action("Oyster Chop", getChopTime(1000, 0.2), [["Woodcutting", 1], ["Speed", 0.2]], completeMove),
	new Action("Create Axe", 2500, [["Smithing", 1]], simpleConvert([["Iron Bar", 1]], [["Iron Axe", 1]]), simpleRequire([["Iron Bar", 1]])),
	new Action("Create Pick", 2500, [["Smithing", 1]], simpleConvert([["Iron Bar", 1]], [["Iron Pick", 1]]), simpleRequire([["Iron Bar", 1]])),
	new Action("Create Hammer", 2500, [["Smithing", 1]], simpleConvert([["Iron Bar", 1]], [["Iron Hammer", 1]]), simpleRequire([["Iron Bar", 1]])),
	new Action("Enter Barrier", 10000, [["Chronomancy", 1]], completeBarrier, startBarrier, null),
];

function getAction<actionName extends anyActionName>(name: actionName) {
	return actions.find(a => a.name == name) as Action<actionName>;
}
