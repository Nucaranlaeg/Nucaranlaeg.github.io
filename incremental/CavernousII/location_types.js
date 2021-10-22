class LocationType {
	constructor(name, symbol, description, enterAction, presentAction, reset, nextCost, enterCount, canWorkTogether = true, startWater = 0){
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
		this.canWorkTogether = canWorkTogether;
		this.startWater = startWater;
	}

	getEnterAction(entered) {
		if (this.name == "Complete Goal" && zones[currentZone].goalComplete){
			return Object.create(getAction("Mine"));
		}
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

function getNextActivateCost(){
	return `${realms[currentRealm].getNextActivateAmount()} gold`;
}

function startCollectManaCost(completions, priorCompletions, zone, x, y){
	return `${writeNumber(this.presentAction.getProjectedDuration(mineManaRockCost(completions, priorCompletions, zone, x, y)) / 1000, 2)}s`;
}

let locationTypes = [
	new LocationType("Solid Rock", "█", "Some kind of rock, too hard to dig through.", null, null, null),
	new LocationType("Tunnel", ".", "A bare stone passage, empty of any ornamentation.", "Walk", null, null),
	new LocationType("Limestone", "#", "A whole bunch of relatively soft rock.", "Mine", null, null),
	new LocationType("Travertine", "«", "A whole bunch of rock, but much harder than usual.", "Mine Travertine", null, null),
	new LocationType("Granite", "╖", "This stone just doesn't want to budge.", "Mine Granite", null, null),
	new LocationType("Basalt", "╣", "You've hit a wall.", "Mine Basalt", null, null),
	new LocationType("Gold ore", "+", "Rocks with veins of gold ore.", "Mine Gold", null, null),
	new LocationType("Iron ore", "%", "Rocks with veins of iron ore.", "Mine Iron", null, null),
	new LocationType("Salt", "░", "A wall of rock salt.  It only takes so long to mine it because you want to sort out the salt and not carry a ton of gravel with you.", "Mine Salt", null, null),
	new LocationType("Mana-infused Rock", "¤", "A whole bunch of rock.  But this time, it glows!", "Mine", "Collect Mana", storeCompletions, startCollectManaCost),
	new LocationType("Mana Spring", "*", "Pure mana, flowing out of the rock.  Each time you absorb the mana, the cost to do so next time increases.", "Walk", "Collect Mana", storeCompletions, startCollectManaCost),
	new LocationType("Strange Machine", "♥", "A strange machine labelled '{'0':'Clone Machine','1':'Rune Enhancer','2':'Rune Enhancer'}'.  What could it do?", "Walk", "Activate Machine", null, getNextActivateCost),
	new LocationType("Vaporizer", "=", "A machine for extracting the magic right out of gold.", "Walk", "Turn Gold to Mana", null),
	new LocationType("Fountain", "^", "A healing fountain, activated by the runes around its base.", "Walk", "Heal", null, null, null, false),
	new LocationType("Bottomless Pit", " ", "A bottomless pit.", "Cross Pit", null, null),
	new LocationType("Lava", "~", "A bottomless pit full of lava.  At least, you're not going to be walking on the bottom, so it's bottomless enough for you.  Your bridges might not last very long here, but probably long enough for one clone.", "Cross Lava", null, null, null, Infinity),
	new LocationType("Runic Book", '"', `A large book sitting open on a pedestal.  It has 4 pages, each with a different rune more complicated than the last.  Runic Lore has a greater effect on this action than normal.`, "Walk", "Read", null),
	new LocationType("Goblin", "g", "An ugly humanoid more likely to try and kill you than to let you by.\n{STATS}", "Attack Creature", null, null),
	new LocationType("Goblin Chieftain", "c", "This one is uglier than the last two.  Probably meaner, too.\n{STATS}", "Attack Creature", null, null),
	new LocationType("Goblin Champion", "m", "The largest of the goblins.  You're going to have to work hard to take him down.\n{STATS}", "Attack Creature", null, null),
	new LocationType("Skeleton", "s", "An undead.  It's not very dangerous, but it is resilient.\n{STATS}", "Attack Creature", null, null),
	new LocationType("Weaken Rune", "W", "Weakens adjacent creatures.", "Walk", null, null),
	new LocationType("Wither Rune", "H", "This rune kills plants next to it.", "Walk", null, null),
	new LocationType("Teleport To Rune", "T", "This rune allows someone or something to come through from another place.", "Walk", null, null),
	new LocationType("Teleport To Rune - Charged", "t", "This rune allows someone or something to come through from another place.", "Walk", null, null),
	new LocationType("Teleport From Rune", "F", "This rune allows someone to slip beyond to another place.", "Walk", null, null),
	new LocationType("Duplication Rune", "D", "This rune increases the yield of mining in the 8 tiles next to it.", "Walk", null, null),
	new LocationType("Duplication Rune - Charged", "d", "This rune increases the yield of mining in the 8 tiles next to it.", "Walk", null, null),
	new LocationType("Coal", "○", "Bituminous coal is present in these rocks.", "Mine Coal", null, null),
	new LocationType("Gem", "☼", "You can find gems studded in the walls here.  Each time you extract a gem from this tile (in one reset), it gets a bit harder to get the next one.", "Mine Gem", "Collect Gem", null),
	new LocationType("Gem Tunnel", "©", "You can find gems studded in the walls here.  Each time you extract a gem from this tile (in one reset), it gets a bit harder to get the next one.", "Mine Gem", "Collect Gem", null),
	new LocationType("Furnace", "╬", "A large box full of fire.", "Walk", "Make Iron Bars", null),
	new LocationType("Anvil - Bridge", "⎶", "An anvil on which you can make a bridge out of {'0':2,'1':4} iron bars.", "Walk", "Create Bridge", null),
	new LocationType("Anvil - Long Bridge", "║", "An anvil on which you can make a bridge out of {'0':2,'1':4} iron bars.  These pits are a bit wider than the others, so it'll take a bit longer to craft the bridge (though your old ones still work for some reason).", "Walk", "Create Long Bridge", null),
	new LocationType("Anvil - Sword", ")", "An anvil on which you can make a sword out of {'0':3,'1':6} iron bars.", "Walk", "Create Sword", null),
	new LocationType("Anvil - Shield", "[", "An anvil on which you can make a shield out of {'0':5,'1':10} iron bars.", "Walk", "Create Shield", null),
	new LocationType("Anvil - Armour", "]", "An anvil on which you can make a suit of armour out of {'0':4,'1':8} iron bars.", "Walk", "Create Armour", null),
	new LocationType("Steel Furnace", "▣", "A large box full of fire.  This one has a slot for coal and a slot for iron bars.", "Walk", "Make Steel Bars", null),
	new LocationType("Anvil - Upgrade Bridge", "&", "An anvil on which you can upgrade an iron bridge into a steel bridge using {'0':1,'1':2} steel bar.", "Walk", "Upgrade Bridge", null),
	new LocationType("Anvil - Upgrade Sword", "(", "An anvil on which you can upgrade an iron sword into a steel sword using {'0':2,'1':4} steel bars.", "Walk", "Upgrade Sword", null),
	new LocationType("Anvil - Upgrade Shield", "{", "An anvil on which you can upgrade an iron shield into a steel shield using {'0':2,'1':4} steel bars.", "Walk", "Upgrade Shield", null),
	new LocationType("Anvil - Upgrade Armour", "}", "An anvil on which you can upgrade an iron suit of armour into a steel suit of armour using {'0':2,'1':4} steel bars.", "Walk", "Upgrade Armour", null),
	new LocationType("Portal", "Θ", "A portal to another zone.", "Walk", "Portal", null),
	new LocationType("Complete Goal", "√", "A strange energy field where you can obtain additional powers.", "Complete Goal", null, null),
	new LocationType("Mushroom", "♠", "A giant mushroom which grows quickly.  It's harder to cut the longer you wait. (Growth: 1+{'0':0.1,'2':0.5}t)", "Chop", null, null),
	new LocationType("Kudzushroom", "♣", "A giant mushroom which grows quickly.  It grows so fast each clone needs to make its own way every time. (Growth: 1+{'0':0.1,'2':0.5}t)", "Kudzu Chop", null, null, null, Infinity),
	new LocationType("Sporeshroom", "α", "A giant mushroom which grows quickly.  While you cut it, it lets out poisonous spores, injuring your clones. (Growth: 1+{'0':0.1,'2':0.5}t)", "Spore Chop", null, null),
	new LocationType("Oystershroom", "§", "A giant mushroom which grows extremely quickly.  You don't think you've ever seen a mushroom grow that fast. (Growth: 1+{'0':0.2,'2':1}t)", "Oyster Chop", null, null),
	new LocationType("Anvil - Axe", "¢", "An anvil on which you can make an axe out of {'0':'an iron bar','1':'2 iron bars'}.", "Walk", "Create Axe", null),
	new LocationType("Anvil - Pick", "¥", "An anvil on which you can make a pick out of {'0':'an iron bar','1':'2 iron bars'}.", "Walk", "Create Pick", null),
	new LocationType("Anvil - Hammer", "£", "An anvil on which you can make a hammer out of {'0':'an iron bar','1':'2 iron bars'}.", "Walk", "Create Hammer", null),
	new LocationType("Spring", "0", "Deep water - it'll spread out and drown you if you're not careful!", "Walk", null, null, null, null, true, 1),
];
