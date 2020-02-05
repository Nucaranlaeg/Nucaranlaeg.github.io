const Permission = Object.freeze({
	"ANY": 0b11,
	"PLAYER": 0b01,
	"DM": 0b10,
});

class Person {
	id;
	constructor(name, title, permission, description, items = [], DMdesc){
		this.name = name;
		this.title = title;
		this.permission = permission;
		this.description = parseDesc(description);
		this.DMdesc = parseDesc(DMdesc);
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
	constructor(name, permission, description, people, locations, zoomcoords, DMdesc){
		this.name = name;
		this.permission = permission;
		this.description = parseDesc(description);
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
		this.DMdesc = parseDesc(DMdesc);
	}
}

class Item {
	id;
	constructor(name, permission, price, description, DMdesc){
		this.name = name;
		this.permission = permission;
		this.price = price; // Represents what it would cost for the players, on an average day.
		this.description = parseDesc(description);
		this.DMdesc = parseDesc(DMdesc);
	}
}

class Location {
	id;
	constructor(name, permission, description, people, items, DMdesc){
		this.name = name;
		this.permission = permission;
		this.description = parseDesc(description);
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
		this.DMdesc = parseDesc(DMdesc);
	}
}

function parseDesc(desc) {
	if (!desc) return "";
	return "&nbsp;&nbsp;" + desc.replace("\n", "<br>&nbsp;&nbsp;");
}

allitems = [
	new Item("Ring of Protection +1", Permission.DM, "1000gp", "Grants +1 AC"),
]
allpeople = [
	new Person("Eldin Fountainhead", "Chancellor", Permission.PLAYER, ""),
	new Person("Soren Steel", "Guard Captain", Permission.PLAYER, "Soren is the captain of the guard in Burst, the Chancery of the Eternal Fountain's biggest city.", ["Ring of Protection +1"]),
	new Person("Exothith", "Lich", Permission.DM, "Exothith is the cause of the blight on the Chancery of the Dead.  He is a very powerful lich, and he has skeleton brigades buried all across the island ready to waylay any interlopers.  When he became a lich, he was motivated by his hatred of his enemies in the Chancery of the Golden Flower, and was willing to sacrifice his chancery for his wrath.\nUnfortunately for him, his power was not enough to bring down a chancery.  Once becoming a lich, he found that his goals became less and less important.  He still desires to destroy the Chancery of the Golden Flower, and continues research on a spell that would disrupt the levitation effect, causing it to plunge into the sea far below.\nIn the meantime, he is content to rule his kingdom undisturbed by mortal concerns.")
];
alllocations = [
	new Location("Sixfold Maze", Permission.PLAYER, "The Sixfold Maze is an ancient structure.  When the Chancery ascended, the first explorers found six entrances.  The maze itself extends all across the chancery, and from time to time new entrances are uncovered.\nIt's not always possible to navigate through the maze, as its non-linear geometry and strange inhabitants make travel perilous.  It is rumoured that creatures appear out of the darkness, even from corridors that had been previously cleared.  It is also rumoured that deep in the maze there are incredible treasures, available for any to find.", [], []),
];
chanceries = [
	new Chancery("Chancery of the Sixfold Maze", Permission.PLAYER, "At the heart of the Chancery of the Sixfold Maze lies the eponymous Sixfold Maze.  The people of Sixfold are not concentrated in any large cities, instead preferring to herd cattle.  It can be hard to travel there, as the twisted geometry of the maze sometimes makes the straight path longer, even on the surface.", [], ["Sixfold Maze"], [320, 390, 2.75]),
	new Chancery("Chancery of the Golden Flower", Permission.PLAYER, "", [], [], [0, -55, 1.9]),
	new Chancery("", Permission.PLAYER, "", [], [], [150, 750, 5]),
	new Chancery("Chancery of the Dead", Permission.PLAYER, "There is no known ruler of the Chancery of the Dead.  Hundreds of years ago, some kind of blight struck the island, killing all of the inhabitants.  No people live on it, and anyone who stays on it for long never makes it off.\nIt is unknown why the chancery has not fallen. Some speculate that it has to do with being in the middle of the other chanceries.  Others whisper that some darker power holds it in its sway.",
	[
		"Exothith",
	], [], [-350, 800, 4]),
	new Chancery("Chancery of the Eternal Fountain", Permission.PLAYER, "One of the oldest chanceries, the Chancery of the Eternal Fountain is also one of the most powerful.  At the centre the island lies a fountain that spills forth clear water day and night.  While much of the flow is directed to the Chancellor's palace, the remainder is available to anyone.\nThe amount of land that the fountain irrigates is the source of most of the wealth of Fountain, as they supply food to many of the other chanceries.  While most of the nobility carries an arming sword, openly carrying any larger weapon within the cities of Fountain can draw much attention.  The roads are well-patrolled and well-tended, but recently there has been grumbling about the excesses of the nobility.",
	[
		"Eldin Fountainhead",
		"Soren Steel",
	], [], [550, -300, 2.5]),
	new Chancery("", Permission.PLAYER, "", [], [], [220, -750, 3]),
	new Chancery("", Permission.PLAYER, "", [], [], [100, 1570, 7]),
	new Chancery("", Permission.PLAYER, "", [], [], [280, 1750, 7]),
	new Chancery("", Permission.PLAYER, "", [], [], [-95, 900, 3]),
	new Chancery("", Permission.PLAYER, "", [], [], [-400, 190, 2]),
	new Chancery("", Permission.PLAYER, "", [], [], [-450, -400, 5]),
	new Chancery("", Permission.PLAYER, "", [], [], [1200, -1000, 7]),
	new Chancery("", Permission.PLAYER, "", [], [], [-1200, -800, 7]),
	new Chancery("", Permission.PLAYER, "", [], [], [-980, -1200, 7]),
	new Chancery("", Permission.PLAYER, "", [], [], [-200, -1700, 7]),
	new Chancery("", Permission.PLAYER, "", [], [], [1200, -1800, 7]),
	new Chancery("", Permission.PLAYER, "", [], [], [1600, 250, 7]),
];

allitems.forEach((item, i) => item.id = i);
allpeople.forEach((person, i) => person.id = i);
alllocations.forEach((location, i) => location.id = i);
chanceries.forEach((chancery, i) => chancery.id = i);
