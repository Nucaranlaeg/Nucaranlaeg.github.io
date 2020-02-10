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
		items.forEach(name => {
			let item = allitems.find(p => p.name == name);
			if (!item) throw "No item " + name;
			this.items.push(item);
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
	constructor(name, permission, price, description){
		this.name = name;
		this.permission = permission;
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
		items.forEach(name => {
			let item = allitems.find(p => p.name == name);
			if (!item) throw "No item " + name;
			this.items.push(item);
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
	new Item("Ring of Protection +1", Permission.DM, "1000gp",
		new Description([["Grants +1 AC", Permission.PLAYER]])
	),
	new Item("Long Chain of the Law", Permission.PLAYER, "80000gp",
		new Description([
			["The Long Chain of the Law is a thin silver chain three feet long.  It serves to bind any creature struck by it.\n", Permission.PLAYER],
			["A creature holding it may use it to attack; it deals no damage but any creature struck may not leave the city.  If it attempts to, a thin unbreakable chain appears wrapped around its wrist.  Only when the chain appears can it be subject to Dispel Magic.\nAdditionally, when a creature is struck by the chain that creature treats any official of the city as though they were under a sanctuary spell.  Both of these effects last for 24 hours.", Permission.DM],
		])
	),
];
allpeople = [
	new Person("Eldin Fountainhead", "Chancellor", Permission.PLAYER,
		new Description([["", Permission.PLAYER]])
	),
	new Person("Soren Steel", "Guard Captain", Permission.PLAYER,
		new Description([["Soren is the captain of the guard in Burst, the Chancery of the Eternal Fountain's biggest city.\nHe is a tall man, nearly six and half feet tall.  Most notable about him, though, is his intimidating presence - even unclad in mail he projects such a fearsome aura that few resist any order he might give.", Permission.PLAYER]]),
		["Ring of Protection +1"]
	),
	new Person("Exothith", "Lich", Permission.DM,
		new Description([
			["Exothith is said to be unassailable, with magic capable of tearing the very sky.  To go against him is the height of folly.  Truly, were bridges built to the Chancery of the Dead, he could march across and desecrate any other chancery in scarce more than a day.\n", Permission.PLAYER],
			["Exothith is the cause of the blight on the Chancery of the Dead.  He is a very powerful lich, and he has skeleton brigades buried all across the island ready to waylay any interlopers.  When he became a lich, he was motivated by his hatred of his enemies in the Chancery of the Golden Flower, and was willing to sacrifice his chancery for his wrath.\nUnfortunately for him, his power was not enough to bring down a chancery.  Once becoming a lich, he found that his goals became less and less important.  He still desires to destroy the Chancery of the Golden Flower, and continues research on a spell that would disrupt the levitation effect, causing it to plunge into the sea far below.\nIn the meantime, he is content to rule his kingdom undisturbed by mortal concerns.", Permission.DM],
		])
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
	new Chancery("", Permission.PLAYER,
		new Description([["", Permission.PLAYER]]),
		[], [], [220, -750, 3]
	),
	new Chancery("", Permission.PLAYER,
		new Description([["", Permission.PLAYER]]),
		[], [], [100, 1570, 7]
	),
	new Chancery("", Permission.PLAYER,
		new Description([["", Permission.PLAYER]]),
		[], [], [280, 1750, 7]
	),
	new Chancery("", Permission.PLAYER,
		new Description([["", Permission.PLAYER]]),
		[], [], [-95, 900, 3]
	),
	new Chancery("", Permission.PLAYER,
		new Description([["", Permission.PLAYER]]),
		[], [], [-400, 190, 2]
	),
	new Chancery("", Permission.PLAYER,
		new Description([["", Permission.PLAYER]]),
		[], [], [-450, -400, 5]
	),
	new Chancery("", Permission.PLAYER,
		new Description([["", Permission.PLAYER]]),
		[], [], [1200, -1000, 7]
	),
	new Chancery("", Permission.PLAYER,
		new Description([["", Permission.PLAYER]]),
		[], [], [-1200, -800, 7]
	),
	new Chancery("", Permission.PLAYER,
		new Description([["", Permission.PLAYER]]),
		[], [], [-980, -1200, 7]
	),
	new Chancery("", Permission.PLAYER,
		new Description([["", Permission.PLAYER]]),
		[], [], [-200, -1700, 7]
	),
	new Chancery("", Permission.PLAYER,
		new Description([["", Permission.PLAYER]]),
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
