const Permission = Object.freeze({
	"ANY": 0b11,
	"PLAYER": 0b01,
	"DM": 0b10,
});

class Person {
	id;
	constructor(name, title, permission, description, items = []){
		this.name = name;
		this.title = title;
		this.permission = permission;
		this.description = description;
		this.items = [];
		items.forEach(item_owned => {
			let item = allitems.find(p => p.name == item_owned[0]);
			if (!item) throw "No item " + item_owned[0];
			this.items.push([item, item_owned[1]]);
		});
	}
}

class Chancery {
	id;
	constructor(name, permission, description, people, locations, zoomcoords){
		this.name = name;
		this.permission = permission;
		this.description = description;
		this.people = [];
		people.forEach(name => {
			let person = allpeople.find(p => p.name == name);
			if (!person) throw "No person " + name;
			person.chancery = this;
			this.people.push(person);
		});
		this.locations = [];
		locations.forEach(name => {
			let location = alllocations.find(p => p.name == name);
			if (!location) throw "No location " + name;
			location.chancery = this;
			this.locations.push(location);
		});
		this.zoomcoords = zoomcoords;
	}
}

class Item {
	id;
	constructor(name, price, description){
		this.name = name;
		this.price = price; // Represents what it would cost for the players, on an average day.
		this.description = description;
	}
}

class Location {
	id;
	constructor(name, permission, description, people, items){
		this.name = name;
		this.permission = permission;
		this.description = description;
		this.people = [];
		people.forEach(name => {
			let person = allpeople.find(p => p.name == name);
			if (!person) throw "No person " + name;
			this.people.push(person);
		});
		this.items = [];
		items.forEach(item_owned => {
			let item = allitems.find(p => p.name == item_owned[0]);
			if (!item) throw "No item " + item_owned[0];
			this.items.push([item, item_owned[1]]);
		});
	}
}

class Description{
	constructor(texts){
		this.texts = texts;
	}

	get_desc(permission){
		let desc = "";
		this.texts.forEach(text => {
			if (text[1] & permission){
				desc += text[0];
			}
		});
		if (!desc) return "";
		return "&nbsp;&nbsp;" + desc.replace("\n", "<br>&nbsp;&nbsp;");
	}
}

allitems = [
	new Item("Ring of Protection +1", "1000gp",
		new Description([["Grants +1 AC", Permission.PLAYER]])
	),
	new Item("Long Chain of the Law", "80000gp",
		new Description([
			["The Long Chain of the Law is a thin silver chain three feet long.  It serves to bind any creature struck by it.", Permission.PLAYER],
			["\nA creature holding it may use it to attack; it deals no damage but any creature struck may not leave the city.  If it attempts to, a thin unbreakable chain appears wrapped around its wrist.  Only when the chain appears can it be subject to Dispel Magic.\nAdditionally, when a creature is struck by the chain that creature treats any official of the city as though they were under a sanctuary spell.  Both of these effects last for 24 hours.", Permission.DM],
		])
	),
	new Item("Shield of Walls", "30000gp",
		new Description([
			["This shield appears to be comprised of bricks, making its edge non-uniform.  Two such shields fit together nicely.", Permission.PLAYER],
			["\nThe Shield of Walls is a +0 magical shield.  When a creature wields a Shield of Walls, he gets a +1 bonus to AC per adjacent creature also wielding a Shield of Walls.", Permission.DM],
		])
	),
	new Item("Glimmerstone", "Unknown",
		new Description([
			["This small stone floats in the air.  It is unbreakable.  It constantly lets off a dim light.  When a creature sees it, they are transfixed and cannot look away.", Permission.PLAYER],
			["The DC for looking away from the Glimmerstone is 30, decreased by 1 for every minute the creature has been looking at it that day.  A creature may attempt a save once per minute.  Once a creature succeeds, that creature is immune to the effect until the next dawn.", Permission.DM],
		])
	)
];
allpeople = [
	new Person("Eldin Fountainhead", "Chancellor", Permission.PLAYER,
		new Description([["", Permission.PLAYER]])
	),
	new Person("Soren Steel", "Guard Captain", Permission.PLAYER,
		new Description([["Soren is the captain of the guard in Burst, the Chancery of the Eternal Fountain's biggest city.\nHe is a tall man, nearly six and half feet tall.  Most notable about him, though, is his intimidating presence - even unclad in mail he projects such a fearsome aura that few resist any order he might give.", Permission.PLAYER]]),
		[["Ring of Protection +1", Permission.DM]]
	),
	new Person("Exothith", "Lich", Permission.DM,
		new Description([
			["Exothith is said to be unassailable, with magic capable of tearing the very sky.  To go against him is the height of folly.  Truly, were bridges built to the Chancery of the Dead, he could march across and desecrate any other chancery in scarce more than a day.\n", Permission.PLAYER],
			["Exothith is the cause of the blight on the Chancery of the Dead.  He is a very powerful lich, and he has skeleton brigades buried all across the island ready to waylay any interlopers.  When he became a lich, he was motivated by his hatred of his enemies in the Chancery of the Golden Flower, and was willing to sacrifice his chancery for his wrath.\nUnfortunately for him, his power was not enough to bring down a chancery.  Once becoming a lich, he found that his goals became less and less important.  He still desires to destroy the Chancery of the Golden Flower, and continues research on a spell that would disrupt the levitation effect, causing it to plunge into the sea far below.\nIn the meantime, he is content to rule his kingdom undisturbed by mortal concerns.", Permission.DM],
		])
	),
	new Person("Aiden Illthan IV", "Chancellor", Permission.PLAYER,
		new Description([["", Permission.PLAYER]])
	),
	new Person("Chadwick Carpenter", "Chancellor", Permission.PLAYER,
		new Description([["Chadwick is the only man to have claimed a new chancery in living memory.  Now over 80 years old, few remember the true story of how he accomplished such a feat, but only repeat the story his government proclaims.  He is ailing and likely to be succeeded by one of his daughters in the next few years.", Permission.PLAYER]])
	),
];
alllocations = [
	new Location("Sixfold Maze", Permission.PLAYER,
		new Description([["The Sixfold Maze is an ancient structure.  When the Chancery ascended, the first explorers found six entrances.  The maze itself extends all across the chancery, and from time to time new entrances are uncovered.\nIt's not always possible to navigate through the maze, as its non-linear geometry and strange inhabitants make travel perilous.  It is rumoured that creatures appear out of the darkness, even from corridors that had been previously cleared.  It is also rumoured that deep in the maze there are incredible treasures, available for any to find.", Permission.PLAYER]]),
		[], []
	),
];
chanceries = [
	new Chancery("Chancery of the Sixfold Maze", Permission.PLAYER,
		new Description([["At the heart of the Chancery of the Sixfold Maze lies the eponymous Sixfold Maze.  The people of Sixfold are not concentrated in any large cities, instead preferring to herd cattle.  It can be hard to travel there, as the twisted geometry of the maze sometimes makes the straight path longer, even on the surface.", Permission.PLAYER]]),
		[], ["Sixfold Maze"], [320, 390, 2.75]
	),
	new Chancery("Chancery of the Golden Flower", Permission.PLAYER,
		new Description([["", Permission.PLAYER]]),
		[], [], [0, -55, 1.9]
	),
	new Chancery("Chancery of the Iron Sceptre", Permission.PLAYER,
		new Description([["", Permission.PLAYER]]),
		[], [], [150, 750, 5]
	),
	new Chancery("Chancery of the Dead", Permission.PLAYER,
		new Description([["There is no known ruler of the Chancery of the Dead.  Hundreds of years ago, some kind of blight struck the island, killing all of the inhabitants.  No people live on it, and anyone who stays on it for long never makes it off.\nIt is unknown why the chancery has not fallen. Some speculate that it has to do with being in the middle of the other chanceries.  Others whisper that some darker power holds it in its sway.", Permission.PLAYER]]),
		[
			"Exothith",
		], [], [-350, 800, 4]
	),
	new Chancery("Chancery of the Eternal Fountain", Permission.PLAYER,
		new Description([["One of the oldest chanceries, the Chancery of the Eternal Fountain is also one of the most powerful.  At the centre the island lies a fountain that spills forth clear water day and night.  While much of the flow is directed to the Chancellor's palace, the remainder is available to anyone.\nThe amount of land that the fountain irrigates is the source of most of the wealth of Fountain, as they supply food to many of the other chanceries.  While most of the nobility carries an arming sword, openly carrying any larger weapon within the cities of Fountain can draw much attention.  The roads are well-patrolled and well-tended, but recently there has been grumbling about the excesses of the nobility.", Permission.PLAYER]]),
		[
			"Eldin Fountainhead",
			"Soren Steel",
		], [], [550, -300, 2.5]
	),
	new Chancery("Chancery of the Immolating Flame", Permission.PLAYER,
		new Description([["", Permission.PLAYER]]),
		[], [], [220, -750, 3]
	),
	new Chancery("Chancery of the Broken Shield", Permission.PLAYER,
		new Description([["", Permission.PLAYER]]),
		[], [], [100, 1570, 7]
	),
	new Chancery("Chancery of the Living Stone", Permission.PLAYER,
		new Description([["In all of Supernatet, the only place to find dwarves is in the Chancery of the Living Stone.  Nowhere in the chancery is there any dirt, for any dirt which touches the stone there immediately also turns to stone.  The dwarves grow strange crops there, which grow despite lack of dirt.\nPlump helmets, a kind of mushroom which brews into a strong wine.  Quarry bushes, whose rock-hard leaves soften when cooked into a delicious (so they say) flatbread.  Sweet pods, which provide a molasses-like syrup when opened.  Nether caps, a much larger mushroom whose continually freezing flesh makes a decent wood.  Others, too, but their appeal to the other races is even less and barely traded.\nThe dwarves make many stone tools which are highly prized in other chanceries, but the dwarves themselves are unwelcome.  That is partly due to their reputation for wanting to steal the dirt of other lands or create stones, a reputation which the dwarves claim is based on nothing.  While the dwarves have some magic in their own halls, their techniques are a closely kept secret and very few artifacts of theirs ever leave Living Stone.", Permission.PLAYER]]),
		[], [], [280, 1750, 7]
	),
	new Chancery("Chancery of the Perpetual Present", Permission.PLAYER,
		new Description([["The seat of the Chancery of the Perpetual Present is a single room.  Within it lives Chancellor Illthan IV, eternally.  It is believed that if he stepped outside his chamber he would immediately wither and die, and the chancery would fall into the sea.  The previous chancellor, Aiden Illthan III, reportedly did so two hundred years ago when he grew tired of living.\nWhile he cannot leave his chamber, he still performs many important functions.  Chief among them is his ability to grant an extended life to those who please him.  His detractors maintain that the only reason he holds on to power is the desire of his nobles for his blessings.", Permission.PLAYER]]),
		[
			"Aiden Illthan IV",
		], [], [-95, 900, 3]
	),
	new Chancery("Chancery of the Great Tree", Permission.PLAYER,
		new Description([["", Permission.PLAYER]]),
		[], [], [-400, 190, 2]
	),
	new Chancery("Chancery of the Ashen Chair", Permission.PLAYER,
		new Description([["The Ashen Chair is the throne of this chancery, the youngest of all Supernatet.  When it arose, Chadwick the carpenter took a tree from the chancery of the Great Tree and fashioned it into a chair.  When he arrived on Ashen Chair he placed it in the centre and refused to move from it for weeks, eating hardtack that he had brought with him and drinking from the pond he had sat down beside.  Finally, fed up with him, his wife lit the chair on fire while he slept.  It burned for hours but never collapsed.  When the fire finally went out, it was as solid as ever.", Permission.PLAYER]]),
		[
			"Chadwick Carpenter",
		], [], [-450, -400, 5]
	),
	new Chancery("Chancery of the Endless Migration", Permission.PLAYER,
		new Description([["The Chancery of the Endless Migration is constantly rolling.  Despite its unusual shape on a map, the layout of the land never changes overmuch.  But if a town is on the North-East edge in the spring, come fall it will be nearing the South-West edge.  No average person has a permanent residence, but most homes are well-built enough that they survive the long months on the underside of Migration and are ready to accept new residents when they return the following year.\nMigration is primarily home to elves, largely because the other races refuse to live in the palace.  The chancellor lives in the palace year round, preferring to build it so that it is as comfortable living in it upside-down as right-side-up.  Only a few retainers and the wealthier lords stay with the chancellor, and it is considered a great honour for them.", Permission.PLAYER]]),
		[], [], [1200, -1000, 7]
	),
	new Chancery("Chancery of the Storm", Permission.PLAYER,
		new Description([["", Permission.PLAYER]]),
		[], [], [-1200, -800, 7]
	),
	new Chancery("Chancery of the Fertile Thicket", Permission.PLAYER,
		new Description([["This chancery is nearly not fit for habitation.  All across Thicket, plants grow incredibly rapidly.  It can be dangerous to stand still for more than a few seconds, as tree roots (or more aggressive plants) can easily grow over a foot, trapping unfortunate creatures underneath.  Some druids have made it their home, and cleared stone paths do allow for limited travel.\nStrange and wonderful things grow here, and many adventurers have returned home with some great treasure pried from the grasp of the plants.  Many more have never returned, and there are some who speak of burning the bridges.", Permission.PLAYER]]),
		[], [], [-980, -1200, 7]
	),
	new Chancery("Chancery of the Glimmerstone", Permission.PLAYER,
		new Description([["The Glimmerstone, from which this chancery gets its name, is a small gemstone.  It attracts the gaze of any who look upon it, and is rumoured to have many other powers.  The chancellor of Glimmerstone is a brutal tyrant, levying no taxes but taking whatever he wills.  He denies any kind of government other than his own, even killing any who would claim to be mayor of a small village.\nDespite the chancellor, Glimmerstone is not extremely poor.  When the chancellor is around, people hide any wealth they might have.  Banditry is not uncommon, but because criminals are executed without mercy, it's not exactly common either.", Permission.PLAYER]]),
		[], [], [-200, -1700, 7]
	),
	new Chancery("Chancery of the Plain", Permission.PLAYER,
		new Description([["The Chancery of the Plain is flat.  Over time, any deviation from the flatness is smoothed out, leaving once again a featureless plain.  It's so flat that you can see all the way across it.  As the palace is the tallest structure in the land, it can be seen from every other point in the chancery.\nPlain is the safest chancery, as it's impossible for bandits to hide.  Guards with the Farsight spell watch from towers, not even needing to patrol.  Because of this, the chancery is also one of the wealthiest.", Permission.PLAYER]]),
		[], [], [1200, -1800, 7]
	),
	new Chancery("", Permission.PLAYER,
		new Description([["", Permission.PLAYER]]),
		[], [], [1600, 250, 7]
	),
];

allitems.forEach((item, i) => item.id = i);
allpeople.forEach((person, i) => person.id = i);
alllocations.forEach((location, i) => location.id = i);
chanceries.forEach((chancery, i) => chancery.id = i);
