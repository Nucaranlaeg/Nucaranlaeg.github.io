"use strict";
const BARRIER_DRAIN = 5;
const VERDANT_GROW_MULT = 5;
let actionIdCounter = 0;
class ActionInstance {
    constructor(action, location, isMove) {
        this.appliedWither = 0;
        this.id = actionIdCounter++; // Every ActionInstance gets a unique id!
        this.isStarted = false;
        this.moved = false;
        this.action = action;
        this.location = location;
        this.isMove = isMove;
        this.startingDuration = this.remainingDuration = 0;
    }
    get expectedLeft() {
        const skillDiv = this.action.getSkillDiv();
        return this.remainingDuration * skillDiv;
    }
    start(clone) {
        if (this.isStarted)
            return CanStartReturnCode.Now;
        const canStart = this.action.attemptStart(this.location, clone);
        if (canStart == CanStartReturnCode.Now && this.remainingDuration == 0) {
            this.startingDuration = this.remainingDuration = this.action.getDuration(this.location, clone);
        }
        if (canStart == CanStartReturnCode.Now)
            this.isStarted = true;
        return canStart;
    }
    tick(time, clone) {
        this.remainingDuration = Math.max(0, this.remainingDuration + this.appliedWither - this.location.wither);
        this.appliedWither = this.location.wither;
        const skillDiv = this.action.getSkillDiv();
        let usedTime = Math.min(time / skillDiv, this.remainingDuration);
        this.action.tick(usedTime, this.location, usedTime * skillDiv, clone);
        this.remainingDuration -= usedTime;
        if (this.remainingDuration == 0) {
            this.isStarted = false;
            if (this.action.complete(this.location, clone, this)) {
                this.start(clone);
            }
            else if (this.isMove) {
                loopCompletions++;
                this.location.entered++;
            }
            else {
                this.location.completions++;
            }
        }
        usedTime *= skillDiv;
    }
}
class Action {
    constructor(name, baseDuration, stats, complete, attemptStart = null, tickExtra = null, specialDuration = () => 1) {
        this.name = name;
        this.baseDuration = baseDuration;
        this.stats = stats.map(s => [getStat(s[0]), s[1]]);
        this.complete = complete || (() => { });
        this.attemptStart = attemptStart || (() => CanStartReturnCode.Now);
        this.tickExtra = tickExtra;
        this.specialDuration = specialDuration;
    }
    tick(usedTime, loc, baseTime = 0, clone) {
        for (let i = 0; i < this.stats.length; i++) {
            this.stats[i][0].gainSkill((baseTime / 1000) * this.stats[i][1]);
        }
        if (this.tickExtra) {
            this.tickExtra(usedTime, loc, baseTime, clone);
        }
    }
    getDuration(location, clone) {
        let duration = (typeof this.baseDuration == "function" ? this.baseDuration() : this.baseDuration) * this.specialDuration(location, clone);
        if (realms[currentRealm].name == "Long Realm") {
            duration *= 3;
        }
        else if (realms[currentRealm].name == "Compounding Realm") {
            duration *= 1 + loopCompletions / 40;
        }
        return duration;
    }
    getBaseDuration(realm = currentRealm) {
        let duration = (typeof this.baseDuration == "function" ? this.baseDuration() : this.baseDuration) / 1000;
        if (realms[realm].name == "Long Realm") {
            duration *= 3;
        }
        else if (realms[realm].name == "Compounding Realm") {
            duration *= 1 + loopCompletions / 40;
        }
        return duration;
    }
    getProjectedDuration(location, applyWither = 0, useDuration = 0) {
        let duration;
        if (useDuration > 0) {
            duration = useDuration;
        }
        else {
            duration = (typeof this.baseDuration == "function" ? this.baseDuration() : this.baseDuration) * this.specialDuration(location);
            duration -= applyWither;
        }
        duration *= this.getSkillDiv();
        if (!useDuration) {
            if (realms[currentRealm].name == "Long Realm") {
                duration *= 3;
            }
            else if (realms[currentRealm].name == "Compounding Realm") {
                duration *= 1 + loopCompletions / 40;
            }
        }
        return duration;
    }
    increaseStat(stat, amount) {
        const index = this.stats.findIndex(s => s[0].name == stat);
        if (index == -1) {
            this.stats.push([getStat(stat), amount]);
        }
        else {
            this.stats[index][1] += amount;
        }
    }
    getSkillDiv() {
        if (this.name == "Wait" || this.name == "Long Wait")
            return 1;
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
function completeMove(loc, clone, action) {
    clone.x = loc.x;
    clone.y = loc.y;
    setMined(loc.x, loc.y);
    action.moved = true;
}
function completeMine(loc) {
    setMined(loc.x, loc.y);
    getMessage("Digging").display();
}
function getDuplicationAmount(loc) {
    let x = loc.x, y = loc.y;
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
function completeGoldMine(loc) {
    const gold = getStuff("Gold Nugget");
    gold.update(getDuplicationAmount(loc));
    if (gold.count >= 5)
        getMessage("Mass Manufacturing").display();
    setMined(loc.x, loc.y);
}
function completeIronMine(loc) {
    const iron = getStuff("Iron Ore");
    iron.update(getDuplicationAmount(loc));
    setMined(loc.x, loc.y);
}
function completeCoalMine(loc) {
    getStuff("Coal").update(getDuplicationAmount(loc));
    setMined(loc.x, loc.y);
}
function completeSaltMine(loc) {
    getStuff("Salt").update(getDuplicationAmount(loc));
    setMined(loc.x, loc.y);
}
function completeCollectMana(loc) {
    Route.updateBestRoute(loc, true);
    zones[currentZone].mineComplete();
    setMined(loc.x, loc.y, ".");
    if (realms[currentRealm].name === "Long Realm") {
        routes.forEach(r => {
            if (r.zone !== loc.zone.index ||
                r.x !== loc.x ||
                r.y !== loc.y)
                return;
            r.needsNewEstimate = true;
        });
    }
    if (settings.autoRestart == AutoRestart.RestartDone && settings.grindMana)
        shouldReset = true;
    getRealmComplete(realms[currentRealm]);
}
function tickCollectMana(usedTime, loc) {
    Route.updateBestRoute(loc);
}
function longZoneCompletionMult(x, y, z) {
    if (x === undefined || y === undefined)
        return 1;
    const location = zones[z].getMapLocation(x, y, true);
    if (location === null)
        throw new Error("Location not found");
    return 0.99 ** (location.priorCompletionData[1] ** 0.75);
}
function canMineMana(location) {
    if (location.completions)
        return CanStartReturnCode.Never;
    return CanStartReturnCode.Now;
}
function mineManaRockCost(location, clone = null, realm = null, completionOveride) {
    return location.completions && !completionOveride
        ? 0
        : Math.pow(1 + (0.1 + 0.05 * (location.zone.index + (realm == null ? currentRealm : realm))) * longZoneCompletionMult(location.x, location.y, location.zone.index), completionOveride ?? location.priorCompletions);
}
function mineGemCost(location) {
    return (location.completions + 1) ** 1.4;
}
function completeCollectGem(loc) {
    getStuff("Gem").update(getDuplicationAmount(loc));
}
function startActivateMachine() {
    const gold = getStuff("Gold Nugget");
    const needed = realms[currentRealm].getNextActivateAmount();
    return gold.count >= needed ? CanStartReturnCode.Now : CanStartReturnCode.NotNow;
}
function completeActivateMachine() {
    const gold = getStuff("Gold Nugget");
    const needed = realms[currentRealm].getNextActivateAmount();
    gold.update(-needed);
    realms[currentRealm].activateMachine();
    getRealmComplete(realms[currentRealm]);
}
function simpleCreate(target) {
    function create() {
        for (let i = 0; i < target.length; i++) {
            const stuff = getStuff(target[i][0]);
            stuff.update(target[i][1]);
        }
    }
    return create;
}
function simpleRequire(requirement, doubleExcempt = false) {
    function haveEnough() {
        const mult = realms[currentRealm].name == "Long Realm" && !doubleExcempt ? 2 : 1;
        for (let i = 0; i < requirement.length; i++) {
            const stuff = getStuff(requirement[i][0]);
            if (stuff.count < requirement[i][1] * (requirement[i][0].match(/Armour|Sword|Shield|Bridge/) ? 1 : mult))
                return CanStartReturnCode.NotNow;
        }
        for (let i = 0; i < requirement.length; i++) {
            const stuff = getStuff(requirement[i][0]);
            stuff.update(-requirement[i][1] * (requirement[i][0].match(/Armour|Sword|Shield|Bridge/) ? 1 : mult));
        }
        return CanStartReturnCode.Now;
    }
    return haveEnough;
}
function canMakeEquip(requirement, equipType) {
    function canDo() {
        const itemCount = stuff.reduce((a, c) => a + (c.name.includes(equipType) ? c.count : 0), 0);
        if (itemCount >= clones.length)
            return CanStartReturnCode.Never;
        const haveStuff = simpleRequire(requirement)();
        if (haveStuff == CanStartReturnCode.NotNow)
            return CanStartReturnCode.NotNow;
        return CanStartReturnCode.Now;
    }
    return canDo;
}
function haveBridge() {
    if (getStuff("Iron Bridge").count || getStuff("Steel Bridge").count)
        return CanStartReturnCode.Now;
    return CanStartReturnCode.NotNow;
}
function completeGoldMana() {
    const manaMult = getRealmMult("Verdant Realm") || 1;
    getStat("Mana").current += GOLD_VALUE * manaMult;
    currentLoopLog.vaporizeGold(1, GOLD_VALUE * manaMult);
    return false;
}
function completeCrossPit(loc) {
    let bridge = getStuff("Iron Bridge");
    if (bridge.count < 1) {
        bridge = getStuff("Steel Bridge");
        if (bridge.count < 1 || !settings.useDifferentBridges)
            return true;
    }
    bridge.update(-1);
    setMined(loc.x, loc.y);
    return false;
}
function completeCrossLava(loc, clone, action) {
    let bridge = getStuff("Steel Bridge");
    if (bridge.count < 1) {
        bridge = getStuff("Iron Bridge");
        if (bridge.count < 1 || !settings.useDifferentBridges)
            return true;
        bridge.update(-1);
        completeMove(loc, clone, action);
        getMessage("Lava Can't Melt Steel Bridges").display();
        return;
    }
    bridge.update(-1);
    setMined(loc.x, loc.y, ".");
    loc.entered = Infinity;
    return false;
}
function tickFight(usedTime, loc, baseTime, clone) {
    if (!loc.creature)
        throw new Error("No creature to fight");
    let damage = (Math.max(loc.creature.attack - getStat("Defense").current, 0) * baseTime) / 1000;
    if (loc.creature.defense >= getStat("Attack").current && loc.creature.attack <= getStat("Defense").current) {
        damage = baseTime / 1000;
    }
    clone.inCombat = true;
    spreadDamage(damage, clone);
}
function spreadDamage(damage, clone) {
    const targetClones = clones.filter(c => c.x == clone.x && c.y == clone.y && c.damage < Infinity);
    targetClones.forEach(c => {
        c.takeDamage(damage / targetClones.length);
    });
}
let combatTools = [
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
function completeFight(loc) {
    const attack = getStat("Attack").current;
    const creature = loc.creature;
    if (!creature)
        throw new Error("No creature to fight");
    if (creature.health) {
        creature.health = Math.max(creature.health - Math.max(attack - creature.defense, 0), 0);
        creature.drawHealth();
    }
    if (!creature.health) {
        clones.forEach(c => {
            c.inCombat = false;
        });
        setMined(loc.x, loc.y);
        return false;
    }
    return true;
}
// Prevent backing out of combat
function startHeal(loc, clone) {
    return clone.inCombat ? CanStartReturnCode.Never : CanStartReturnCode.Now;
}
function tickHeal(usedTime, loc, baseTime, clone) {
    clone.takeDamage(-usedTime / 1000);
}
function completeHeal(loc, clone) {
    return clone.damage > 0;
}
function predictHeal(loc, clone = null) {
    if (!clone)
        return 1;
    return Math.max(clone.damage * getStat("Runic Lore").value, 0.01);
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
function startTeleport() {
    for (let y = 0; y < zones[currentZone].map.length; y++) {
        for (let x = 0; x < zones[currentZone].map[y].length; x++) {
            if (zones[currentZone].map[y][x] == "t") {
                return CanStartReturnCode.Now;
            }
        }
    }
    return CanStartReturnCode.NotNow;
}
function completeTeleport(loc, clone) {
    for (let y = 0; y < zones[currentZone].map.length; y++) {
        for (let x = 0; x < zones[currentZone].map[y].length; x++) {
            if (zones[currentZone].map[y][x] == "t") {
                clone.x = x - zones[currentZone].xOffset;
                clone.y = y - zones[currentZone].yOffset;
                return;
            }
        }
    }
}
function predictTeleport() {
    for (let y = 0; y < zones[currentZone].map.length; y++) {
        for (let x = 0; x < zones[currentZone].map[y].length; x++) {
            if (zones[currentZone].map[y][x] == "t") {
                return 1;
            }
        }
    }
    return Infinity;
}
function startChargableRune(location) {
    if (location.completions > 0) {
        return CanStartReturnCode.Never;
    }
    return CanStartReturnCode.Now;
}
function duplicateDuration() {
    let runes = 0;
    for (let y = 0; y < zones[currentZone].map.length; y++) {
        runes += zones[currentZone].map[y].split(/[dD]/).length - 1;
    }
    return 2 ** (runes - 1);
}
function completeChargeRune(loc) {
    setMined(loc.x, loc.y, zones[currentZone].map[loc.y + zones[currentZone].yOffset][loc.x + zones[currentZone].xOffset].toLowerCase());
}
function tickWither(usedTime, loc) {
    let x = loc.x + zones[currentZone].xOffset;
    let y = loc.y + zones[currentZone].yOffset;
    const wither = getRune("Wither");
    const adjacentPlants = [
        shrooms.includes(zones[currentZone].map[y - 1][x]) ? zones[currentZone].mapLocations[y - 1][x] : null,
        shrooms.includes(zones[currentZone].map[y][x - 1]) ? zones[currentZone].mapLocations[y][x - 1] : null,
        shrooms.includes(zones[currentZone].map[y + 1][x]) ? zones[currentZone].mapLocations[y + 1][x] : null,
        shrooms.includes(zones[currentZone].map[y][x + 1]) ? zones[currentZone].mapLocations[y][x + 1] : null
    ].filter((p) => p !== null);
    if (wither.upgradeCount > 0) {
        adjacentPlants.push(...[
            shrooms.includes(zones[currentZone].map[y - 1][x - 1]) ? zones[currentZone].mapLocations[y - 1][x - 1] : null,
            shrooms.includes(zones[currentZone].map[y + 1][x - 1]) ? zones[currentZone].mapLocations[y + 1][x - 1] : null,
            shrooms.includes(zones[currentZone].map[y + 1][x + 1]) ? zones[currentZone].mapLocations[y + 1][x + 1] : null,
            shrooms.includes(zones[currentZone].map[y - 1][x + 1]) ? zones[currentZone].mapLocations[y - 1][x + 1] : null
        ].filter((p) => p !== null));
    }
    adjacentPlants.forEach(loc => {
        loc.wither += usedTime * (wither.upgradeCount ? 2 ** (wither.upgradeCount - 1) : 1);
        if (loc.type.getEnterAction(loc.entered).getProjectedDuration(loc, loc.wither) <= 0) {
            setMined(loc.x, loc.y, ".");
            loc.wither = 0;
            loc.entered = Infinity;
        }
    });
}
function completeWither(loc) {
    let x = loc.x + zones[currentZone].xOffset;
    let y = loc.y + zones[currentZone].yOffset;
    const adjacentPlants = [
        shrooms.includes(zones[currentZone].map[y - 1][x]) ? zones[currentZone].mapLocations[y - 1][x] : null,
        shrooms.includes(zones[currentZone].map[y][x - 1]) ? zones[currentZone].mapLocations[y][x - 1] : null,
        shrooms.includes(zones[currentZone].map[y + 1][x]) ? zones[currentZone].mapLocations[y + 1][x] : null,
        shrooms.includes(zones[currentZone].map[y][x + 1]) ? zones[currentZone].mapLocations[y][x + 1] : null
    ].filter(p => p);
    if (getRune("Wither").upgradeCount > 0) {
        adjacentPlants.push(...[
            shrooms.includes(zones[currentZone].map[y - 1][x - 1]) ? zones[currentZone].mapLocations[y - 1][x - 1] : null,
            shrooms.includes(zones[currentZone].map[y + 1][x - 1]) ? zones[currentZone].mapLocations[y + 1][x - 1] : null,
            shrooms.includes(zones[currentZone].map[y + 1][x + 1]) ? zones[currentZone].mapLocations[y + 1][x + 1] : null,
            shrooms.includes(zones[currentZone].map[y - 1][x + 1]) ? zones[currentZone].mapLocations[y - 1][x + 1] : null
        ].filter(p => p));
    }
    if (!adjacentPlants.length)
        return false;
    return true;
}
function predictWither(location) {
    let x = location.x;
    let y = location.y;
    if (x === null || y === null)
        return 1;
    x += zones[currentZone].xOffset;
    y += zones[currentZone].yOffset;
    const wither = getRune("Wither");
    const adjacentPlants = [
        shrooms.includes(zones[currentZone].map[y - 1][x]) ? zones[currentZone].mapLocations[y - 1][x] : null,
        shrooms.includes(zones[currentZone].map[y][x - 1]) ? zones[currentZone].mapLocations[y][x - 1] : null,
        shrooms.includes(zones[currentZone].map[y + 1][x]) ? zones[currentZone].mapLocations[y + 1][x] : null,
        shrooms.includes(zones[currentZone].map[y][x + 1]) ? zones[currentZone].mapLocations[y][x + 1] : null
    ].filter((p) => p !== null);
    if (wither.upgradeCount > 0) {
        adjacentPlants.push(...[
            shrooms.includes(zones[currentZone].map[y - 1][x - 1]) ? zones[currentZone].mapLocations[y - 1][x - 1] : null,
            shrooms.includes(zones[currentZone].map[y + 1][x - 1]) ? zones[currentZone].mapLocations[y + 1][x - 1] : null,
            shrooms.includes(zones[currentZone].map[y + 1][x + 1]) ? zones[currentZone].mapLocations[y + 1][x + 1] : null,
            shrooms.includes(zones[currentZone].map[y - 1][x + 1]) ? zones[currentZone].mapLocations[y - 1][x + 1] : null
        ].filter((p) => p !== null));
    }
    if (!adjacentPlants.length)
        return 0;
    return Math.max(...adjacentPlants.map(loc => loc.type.getEnterAction(loc.entered).getProjectedDuration(loc, loc.wither))) / 2000 + 0.1;
}
function activatePortal() {
    breakActions = true;
    moveToZone(currentZone + 1);
    if (settings.pauseOnPortal && settings.running)
        toggleRunning();
}
function completeGoal(loc) {
    zones[currentZone].completeGoal();
    setMined(loc.x, loc.y);
}
function getChopTime(base, increaseRate) {
    return () => base + increaseRate * queueTime * (realms[currentRealm].name == "Verdant Realm" ? VERDANT_GROW_MULT : 1);
}
function tickSpore(usedTime, loc, baseTime, clone) {
    spreadDamage(baseTime / 1000, clone);
}
function completeBarrier(loc) {
    zones[currentZone].manaDrain += BARRIER_DRAIN;
    document.querySelector("#barrier-mult").style.display = "block";
    document.querySelector("#current-barrier-mult").innerHTML = `x${zones[currentZone].manaDrain + 1}`;
    setMined(loc.x, loc.y);
}
function startBarrier(location) {
    let barrierNumber = +zones[currentZone].map[location.y + zones[currentZone].yOffset][location.x + zones[currentZone].xOffset];
    if (!isNaN(barrierNumber) && getRealm("Compounding Realm").machineCompletions >= barrierNumber)
        return CanStartReturnCode.Now;
    return CanStartReturnCode.Never;
}
function barrierDuration() {
    if (realms[currentRealm].name == "Compounding Realm") {
        return 1 / (1 + loopCompletions / 40);
    }
    return 1;
}
function completeGame() {
    getMessage("You Win!").display();
    // Reunlock VR
    const vr = getRealm("Verdant Realm");
    vr.maxMult = 1e308;
    vr.completed = false;
    vr.display();
}
var ACTION;
(function (ACTION) {
    ACTION["WALK"] = "Walk";
    ACTION["WAIT"] = "Wait";
    ACTION["LONG_WAIT"] = "Long Wait";
    ACTION["MINE"] = "Mine";
    ACTION["MINE_TRAVERTINE"] = "Mine Travertine";
    ACTION["MINE_GRANITE"] = "Mine Granite";
    ACTION["MINE_BASALT"] = "Mine Basalt";
    ACTION["MINE_CHERT"] = "Mine Chert";
    ACTION["MINE_GOLD"] = "Mine Gold";
    ACTION["MINE_IRON"] = "Mine Iron";
    ACTION["MINE_COAL"] = "Mine Coal";
    ACTION["MINE_SALT"] = "Mine Salt";
    ACTION["MINE_GEM"] = "Mine Gem";
    ACTION["COLLECT_GEM"] = "Collect Gem";
    ACTION["COLLECT_MANA"] = "Collect Mana";
    ACTION["ACTIVATE_MACHINE"] = "Activate Machine";
    ACTION["MAKE_IRON_BARS"] = "Make Iron Bars";
    ACTION["MAKE_STEEL_BARS"] = "Make Steel Bars";
    ACTION["TURN_GOLD_TO"] = "Turn Gold to Mana";
    ACTION["CROSS_PIT"] = "Cross Pit";
    ACTION["CROSS_LAVA"] = "Cross Lava";
    ACTION["CREATE_BRIDGE"] = "Create Bridge";
    ACTION["CREATE_LONG_BRIDGE"] = "Create Long Bridge";
    ACTION["UPGRADE_BRIDGE"] = "Upgrade Bridge";
    ACTION["READ"] = "Read";
    ACTION["CREATE_SWORD"] = "Create Sword";
    ACTION["UPGRADE_SWORD"] = "Upgrade Sword";
    ACTION["ENCHANT_SWORD"] = "Enchant Sword";
    ACTION["CREATE_SHIELD"] = "Create Shield";
    ACTION["UPGRADE_SHIELD"] = "Upgrade Shield";
    ACTION["ENCHANT_SHIELD"] = "Enchant Shield";
    ACTION["CREATE_ARMOUR"] = "Create Armour";
    ACTION["UPGRADE_ARMOUR"] = "Upgrade Armour";
    ACTION["ENCHANT_ARMOUR"] = "Enchant Armour";
    ACTION["ATTACK_CREATURE"] = "Attack Creature";
    ACTION["TELEPORT"] = "Teleport";
    ACTION["CHARGE_DUPLICATION"] = "Charge Duplication";
    ACTION["CHARGE_WITHER"] = "Charge Wither";
    ACTION["CHARGE_TELEPORT"] = "Charge Teleport";
    ACTION["PUMP"] = "Pump";
    ACTION["HEAL"] = "Heal";
    ACTION["PORTAL"] = "Portal";
    ACTION["COMPLETE_GOAL"] = "Complete Goal";
    ACTION["CHOP"] = "Chop";
    ACTION["CHOP_KUDZU"] = "Kudzu Chop";
    ACTION["CHOP_SPORE"] = "Spore Chop";
    ACTION["CHOP_OYSTER"] = "Oyster Chop";
    ACTION["CREATE_AXE"] = "Create Axe";
    ACTION["CREATE_PICK"] = "Create Pick";
    ACTION["CREATE_HAMMER"] = "Create Hammer";
    ACTION["ENTER_BARRIER"] = "Enter Barrier";
    ACTION["EXIT"] = "Exit";
})(ACTION || (ACTION = {}));
const actions = [
    new Action("Walk", 100, [["Speed", 1]], completeMove),
    new Action("Wait", 100, [["Speed", 1]], () => { }),
    new Action("Long Wait", () => settings.longWait, [["Speed", 1]], () => { }),
    new Action("Mine", 1000, [["Mining", 1], ["Speed", 0.2]], completeMine),
    new Action("Mine Travertine", 10000, [["Mining", 1], ["Speed", 0.2]], completeMine),
    new Action("Mine Granite", 350000, [["Mining", 1], ["Speed", 0.2]], completeMine),
    new Action("Mine Basalt", 4000000, [["Mining", 1], ["Speed", 0.2]], completeMine),
    new Action("Mine Chert", 50000000, [["Mining", 1], ["Speed", 0.2]], completeMine),
    new Action("Mine Gold", 1000, [["Mining", 1], ["Speed", 0.2]], completeGoldMine),
    new Action("Mine Iron", 2500, [["Mining", 2]], completeIronMine),
    new Action("Mine Coal", 5000, [["Mining", 2]], completeCoalMine),
    new Action("Mine Salt", 50000, [["Mining", 1]], completeSaltMine),
    new Action("Mine Gem", 100000, [["Mining", 0.75], ["Gemcraft", 0.25]], completeMine),
    new Action("Collect Gem", 100000, [["Smithing", 0.1], ["Gemcraft", 1]], completeCollectGem, null, null, mineGemCost),
    new Action("Collect Mana", 1000, [["Magic", 1]], completeCollectMana, canMineMana, tickCollectMana, mineManaRockCost),
    new Action("Activate Machine", 1000, [], completeActivateMachine, startActivateMachine),
    new Action("Make Iron Bars", 5000, [["Smithing", 1]], simpleCreate([["Iron Bar", 1]]), simpleRequire([["Iron Ore", 1]], true)),
    new Action("Make Steel Bars", 15000, [["Smithing", 1]], simpleCreate([["Steel Bar", 1]]), simpleRequire([["Iron Bar", 1], ["Coal", 1]], true)),
    new Action("Turn Gold to Mana", 1000, [["Magic", 1]], completeGoldMana, simpleRequire([["Gold Nugget", 1]], true)),
    new Action("Cross Pit", 3000, [["Smithing", 1], ["Speed", 0.3]], completeCrossPit, haveBridge),
    new Action("Cross Lava", 6000, [["Smithing", 1], ["Speed", 0.3]], completeCrossLava, haveBridge),
    new Action("Create Bridge", 5000, [["Smithing", 1]], simpleCreate([["Iron Bridge", 1]]), simpleRequire([["Iron Bar", 2]])),
    new Action("Create Long Bridge", 50000, [["Smithing", 1]], simpleCreate([["Iron Bridge", 1]]), simpleRequire([["Iron Bar", 2]])),
    new Action("Upgrade Bridge", 12500, [["Smithing", 1]], simpleCreate([["Steel Bridge", 1]]), simpleRequire([["Steel Bar", 1], ["Iron Bridge", 1]])),
    new Action("Create Sword", 7500, [["Smithing", 1]], simpleCreate([["Iron Sword", 1]]), canMakeEquip([["Iron Bar", 3]], "Sword")),
    new Action("Upgrade Sword", 22500, [["Smithing", 1]], simpleCreate([["Steel Sword", 1]]), simpleRequire([["Steel Bar", 2], ["Iron Sword", 1]])),
    new Action("Enchant Sword", 3000000, [["Smithing", 0.5], ["Gemcraft", 0.5]], simpleCreate([["+1 Sword", 1]]), simpleRequire([["Gem", 3], ["Steel Sword", 1]])),
    new Action("Create Shield", 12500, [["Smithing", 1]], simpleCreate([["Iron Shield", 1]]), canMakeEquip([["Iron Bar", 5]], "Shield")),
    new Action("Upgrade Shield", 27500, [["Smithing", 1]], simpleCreate([["Steel Shield", 1]]), simpleRequire([["Steel Bar", 2], ["Iron Shield", 1]])),
    new Action("Enchant Shield", 3000000, [["Smithing", 0.5], ["Gemcraft", 0.5]], simpleCreate([["+1 Shield", 1]]), simpleRequire([["Gem", 3], ["Steel Shield", 1]])),
    new Action("Create Armour", 10000, [["Smithing", 1]], simpleCreate([["Iron Armour", 1]]), canMakeEquip([["Iron Bar", 4]], "Armour")),
    new Action("Upgrade Armour", 25000, [["Smithing", 1]], simpleCreate([["Steel Armour", 1]]), simpleRequire([["Steel Bar", 2], ["Iron Armour", 1]])),
    new Action("Enchant Armour", 3000000, [["Smithing", 0.5], ["Gemcraft", 0.5]], simpleCreate([["+1 Armour", 1]]), simpleRequire([["Gem", 3], ["Steel Armour", 1]])),
    new Action("Attack Creature", 1000, [["Combat", 1]], completeFight, null, tickFight, combatDuration),
    new Action("Teleport", 1, [["Runic Lore", 1]], completeTeleport, startTeleport, null, predictTeleport),
    new Action("Charge Duplication", 50000, [["Runic Lore", 1]], completeChargeRune, startChargableRune, null, duplicateDuration),
    new Action("Charge Wither", 1000, [["Runic Lore", 1]], completeWither, null, tickWither, predictWither),
    new Action("Charge Teleport", 50000, [["Runic Lore", 1]], completeChargeRune, startChargeTeleport),
    new Action("Pump", 0, [], () => { }),
    new Action("Heal", 1000, [["Runic Lore", 1]], completeHeal, startHeal, tickHeal, predictHeal),
    new Action("Portal", 1, [["Magic", 0.5], ["Runic Lore", 0.5]], activatePortal),
    new Action("Complete Goal", 1000, [["Speed", 1]], completeGoal),
    new Action("Chop", getChopTime(1000, 0.1), [["Woodcutting", 1], ["Speed", 0.2]], completeMine),
    new Action("Kudzu Chop", getChopTime(1000, 0.1), [["Woodcutting", 1], ["Speed", 0.2]], completeMove),
    new Action("Spore Chop", getChopTime(1000, 0.1), [["Woodcutting", 1], ["Speed", 0.2]], completeMine, null, tickSpore),
    new Action("Oyster Chop", getChopTime(1000, 0.2), [["Woodcutting", 1], ["Speed", 0.2]], completeMine),
    new Action("Create Axe", 2500, [["Smithing", 1]], simpleCreate([["Iron Axe", 1]]), simpleRequire([["Iron Bar", 1]])),
    new Action("Create Pick", 2500, [["Smithing", 1]], simpleCreate([["Iron Pick", 1]]), simpleRequire([["Iron Bar", 1]])),
    new Action("Create Hammer", 2500, [["Smithing", 1]], simpleCreate([["Iron Hammer", 1]]), simpleRequire([["Iron Bar", 1]])),
    new Action("Enter Barrier", 10000, [["Chronomancy", 1]], completeBarrier, startBarrier, null, barrierDuration),
    new Action("Exit", 50000000, [["Mining", 0.25], ["Woodcutting", 0.25], ["Magic", 0.25], ["Speed", 0.25], ["Smithing", 0.25], ["Runic Lore", 0.25], ["Combat", 0.25], ["Gemcraft", 0.25], ["Chronomancy", 0.25]], completeGame),
];
function getAction(name) {
    return actions.find(a => a.name == name);
}
getAction("Wait").getDuration = getAction("Wait").getBaseDuration = getAction("Wait").getProjectedDuration = () => getAction("Wait").baseDuration;
getAction("Long Wait").getDuration = getAction("Long Wait").getBaseDuration = getAction("Long Wait").getProjectedDuration = () => getAction("Long Wait").baseDuration();
//# sourceMappingURL=actions.js.map