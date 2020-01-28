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
	constructor(name, permission, description, people, DMdesc){
		this.name = name;
		this.permission = permission;
		this.description = parseDesc(description);
		this.people = [];
		people.forEach(name => {
			let person = allpeople.find(p => p.name == name);
			if (person.chancery){
				throw person.name + " assigned to multiple chanceries!";
			}
			person.chancery = this;
			this.people.push(person);
		});
		this.DMdesc = parseDesc(DMdesc);
	}
}

class Item {
	id;
	constructor(name, permission, buy, sell, description, DMdesc){
		this.name = name;
		this.permission = permission;
		this.buy = buy; // Represents what it would cost for the players, on an average day.
		this.sell = sell; // Represents what it would fetch for the players, on an average day.
		this.description = parseDesc(description);
		this.DMdesc = parseDesc(DMdesc);
	}
}

function parseDesc(desc) {
	if (!desc) return "";
	return "&nbsp;&nbsp;" + desc.replace("\n", "<br>&nbsp;&nbsp;");
}

allitems = [
	new Item("Ring of Protection +1", Permission.DM, "1000gp", "500gp", "Grants +1 AC"),
]
allpeople = [
	new Person("Eldin Fountainhead", "Chancellor", Permission.PLAYER, ""),
	new Person("Soren Steel", "Guard Captain", Permission.PLAYER, "Soren is the captain of the guard in Burst, the Chancery of the Eternal Fountain's biggest city.", ["Ring of Protection +1"]),
];
chanceries = [
	new Chancery("Chancery of the Eternal Fountain", Permission.PLAYER, "One of the oldest chanceries, the Chancery of the Eternal Fountain is also one of the most powerful.  At the centre of its largest island lies a fountain that spills forth clear water day and night.  While much of the flow is directed to the Chancellor's palace, the remainder is available to anyone.\nThe amount of land that the fountain irrigates is the source of most of the wealth of Fountain, as they supply food to many of the other chanceries.  While most of the nobility carries an arming sword, openly carrying any larger weapon within the cities of Fountain can draw much attention.  The roads are well-patrolled and well-tended, but recently there has been grumbling about the excesses of the nobility.",
	[
		"Eldin Fountainhead",
		"Soren Steel",
	]),
];

allitems.forEach((item, i) => item.id = i);
allpeople.forEach((person, i) => person.id = i);
chanceries.forEach((chancery, i) => chancery.id = i);
