class LocationType<locationTypeName extends string = string> {
	name: locationTypeName;
	symbol: string;
	description: string;
	enterAction: anyAction | null;
	presentAction: anyAction | null;
	nextCost: ((this: LocationType, completions: number, priorCompletions: number, zone: Zone, x: number, y: number) => string) | null;
	enterCount: number;
	extraReset: this["reset"] | null = null;
	canWorkTogether: boolean;
	startWater: number;

	constructor(
		name: locationTypeName,
		symbol: string,
		description: string,
		enterAction: anyActionName | null,
		presentAction: anyActionName | null,
		extraReset: LocationType<locationTypeName>["extraReset"] | null = null,
		nextCost:
			| ((this: LocationType, completions: number, priorCompletions: number, zone: Zone, x: number, y: number) => string)
			| null = null,
		enterCount: number = 1,
		canWorkTogether = true,
		startWater = 0
	) {
		this.name = name;
		this.symbol = symbol;
		this.description = description;
		this.enterAction = (enterAction ? Object.create(getAction(enterAction)) : null) as anyAction | null;
		this.presentAction = (presentAction ? Object.create(getAction(presentAction)) : null) as anyAction | null;
		this.nextCost = nextCost;
		this.enterCount = enterCount;
		if (extraReset) {
			this.extraReset = extraReset;
		}
		this.canWorkTogether = canWorkTogether;
		this.startWater = startWater;
	}

	getEnterAction(entered: number): anyAction {
		if (entered >= this.enterCount) {
			return Object.create(getAction("Walk"));
		}
		if (this.name == "Complete Goal" && zones[currentZone].goalComplete) {
			return Object.create(getAction("Mine"));
		}
		return this.enterAction!;
	}

	reset(...args: unknown[]): number {
		if (this.extraReset) return this.extraReset(...args);
		return 0;
	}
}

function storeCompletions(completions: number, priorCompletions: number) {
	return completions + priorCompletions;
}

function getNextActivateCost() {
	return `${realms[currentRealm].getNextActivateAmount()} gold`;
}

function startCollectManaCost(
	this: LocationType,
	completions: number,
	priorCompletions: number,
	zone: Zone,
	x: number,
	y: number
): string {
	return `${writeNumber(
		this.presentAction ? this.presentAction.getProjectedDuration(getMapLocation(x, y, true, zone.index)!) / 1000 : -1,
		2
	)}s`;
}
function getLocationType<T extends anyLocationTypeName>(name: T):LocationType<T>
function getLocationType(name: string): LocationType<anyLocationTypeName> | undefined
function getLocationType(name: string):LocationType | undefined {
	return locationTypes.find(a => a.name == name);
}

type anyLocationTypeName = typeof locationTypes[number]["name"]

const locationTypes = [
	new LocationType("Solid Rock", "█", "Some kind of rock, too hard to dig through.", null, null, null),
	new LocationType("Tunnel", ".", "A bare stone passage, empty of any ornamentation.", "Walk", null, null),
	new LocationType("Limestone", "#", "A whole bunch of relatively soft rock.", "Mine", null, null),
	new LocationType("Travertine", "«", "A whole bunch of rock, but much harder than usual.", "Mine Travertine", null, null),
	new LocationType("Granite", "╖", "This stone just doesn't want to budge.", "Mine Granite", null, null),
	new LocationType("Basalt", "╣", "You've hit a wall.", "Mine Basalt", null, null),
	new LocationType("Chert", "■", "You'd think it was the hard rock all around it, but it's a different colour.", "Mine Chert", null, null),
	new LocationType("Gold ore", "+", "Rocks with veins of gold ore.", "Mine Gold", null, null),
	new LocationType("Iron ore", "%", "Rocks with veins of iron ore.", "Mine Iron", null, null),
	new LocationType("Salt", "░", "A wall of rock salt.  It only takes so long to mine it because you want to sort out the salt and not carry a ton of gravel with you.", "Mine Salt", null, null),
	new LocationType("Mana-infused Rock", "¤", "A whole bunch of rock.  But this time, it glows!", "Mine", "Collect Mana", storeCompletions, startCollectManaCost),
	new LocationType<"Mana Spring">("Mana Spring", "*", "Pure mana, flowing out of the rock.  Each time you absorb the mana, the cost to do so next time increases.", "Walk", "Collect Mana", storeCompletions, startCollectManaCost),
	new LocationType("Strange Machine", "♥", "A strange machine labelled '{'0':'Clone Machine','1':'Rune Enhancer','2':'Rune Enhancer','3':'Time Stretcher'}'.  What could it do?", "Walk", "Activate Machine", null, getNextActivateCost),
	new LocationType("Vaporizer", "=", "A machine for extracting the magic right out of gold. ({MANA_PER_GOLD} mana per gold)", "Walk", "Turn Gold to Mana", null),
	new LocationType("Fountain", "^", "A healing fountain, activated by the runes around its base.", "Walk", "Heal", null, null, undefined, false),
	new LocationType("Bottomless Pit", " ", "A bottomless pit.", "Cross Pit", null, null),
	new LocationType("Lava", "~", "A bottomless pit full of lava.  At least, you're not going to be walking on the bottom, so it's bottomless enough for you.  Your bridges might not last very long here, but probably long enough for one clone.", "Cross Lava", null, null, null, Infinity),
	new LocationType("Goblin", "g", "An ugly humanoid more likely to try and kill you than to let you by.\n{STATS}", "Attack Creature", null, null),
	new LocationType("Goblin Chieftain", "c", "This one is uglier than the last two.  Probably meaner, too.\n{STATS}", "Attack Creature", null, null),
	new LocationType("Goblin Champion", "m", "The largest of the goblins.  You're going to have to work hard to take him down.\n{STATS}", "Attack Creature", null, null),
	new LocationType("Skeleton", "s", "An undead.  It's not very dangerous, but it is resilient.\n{STATS}", "Attack Creature", null, null),
	new LocationType("Golem", "G", "A towering golem made out of finely crafted stone.  There aren't even any chinks in its armour!\n{STATS}", "Attack Creature", null, null),
	new LocationType("Guardian", "X", "This massive creature exudes an aura of implacable doom.\n{STATS}", "Attack Creature", null, null),
	new LocationType("Weaken Rune", "W", "Weakens adjacent creatures.", "Walk", null, null),
	new LocationType("Wither Rune", "H", "This rune kills plants next to it.", "Walk", null, null),
	new LocationType("Teleport To Rune", "T", "This rune allows someone or something to come through from another place.", "Walk", null, null),
	new LocationType("Teleport To Rune - Charged", "t", "This rune allows someone or something to come through from another place.", "Walk", null, null),
	new LocationType("Teleport From Rune", "F", "This rune allows someone to slip beyond to another place.", "Walk", null, null),
	new LocationType("Duplication Rune", "D", "This rune increases the yield of mining in the 8 tiles next to it.", "Walk", null, null),
	new LocationType("Duplication Rune - Charged", "d", "This rune increases the yield of mining in the 8 tiles next to it.", "Walk", null, null),
	new LocationType("Pump Rune", "P", "This rune drains water from it and orthogonally adjacent tiles.", "Walk", null, null),
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
	new LocationType("Kudzushroom", "♣", "A giant mushroom which grows quickly.  It grows so fast each clone needs to make its own way every time. (Growth: 1+{'0':0.1,'2':0.5}t)", "Kudzu Chop", null, null, null, Infinity, false),
	new LocationType("Sporeshroom", "α", "A giant mushroom which grows quickly.  While you cut it, it lets out poisonous spores, injuring your clones cutting it for 1 damage per second. (Growth: 1+{'0':0.1,'2':0.5}t)", "Spore Chop", null, null),
	new LocationType("Oystershroom", "§", "A giant mushroom which grows extremely quickly.  You don't think you've ever seen a mushroom grow that fast. (Growth: 1+{'0':0.2,'2':1}t)", "Oyster Chop", null, null),
	new LocationType("Springshroom", "δ", "A giant mushroom which grows quickly.  It seems to continually spray water. (Growth: 1+{'0':0.1,'2':0.5}t)", "Chop", null, null, null, undefined, true, 0.001),
	new LocationType("Anvil - Axe", "¢", "An anvil on which you can make an axe out of {'0':'an iron bar','1':'2 iron bars'}.", "Walk", "Create Axe", null),
	new LocationType("Anvil - Pick", "¥", "An anvil on which you can make a pick out of {'0':'an iron bar','1':'2 iron bars'}.", "Walk", "Create Pick", null),
	new LocationType("Anvil - Hammer", "£", "An anvil on which you can make a hammer out of {'0':'an iron bar','1':'2 iron bars'}.", "Walk", "Create Hammer", null),
	new LocationType("Spring", "0", "Deep water - it'll spread out and drown you if you're not careful!", "Walk", null, null, null, undefined, true, 1),
	new LocationType("Sword Enchanter", "|", "An anvil on which you can enchant a steel sword using {'0':5,'1':10} gems.", "Walk", "Enchant Sword", null),
	new LocationType("Shield Enchanter", "<", "An anvil on which you can enchant a steel shield using {'0':5,'1':10} gems.", "Walk", "Enchant Shield", null),
	new LocationType("Armour Enchanter", ">", "An anvil on which you can enchant a steel suit of armour using {'0':5,'1':10} gems.", "Walk", "Enchant Armour", null),
	new LocationType("Timelike Barrier", "1", "A wall made of a strange energy that saps your mana. {'3':'Its duration does not compound.'}", "Enter Barrier", null, null),
	new LocationType("Timelike Barrier", "2", "A wall made of a strange energy that saps your mana. {'3':'Its duration does not compound.'}", "Enter Barrier", null, null),
	new LocationType("Timelike Barrier", "3", "A wall made of a strange energy that saps your mana. {'3':'Its duration does not compound.'}", "Enter Barrier", null, null),
	new LocationType("Exit", "!", "A door.  Opening to the outside world", "Exit", null, null),
	new LocationType("Not a location", "", "", null, null),
];
