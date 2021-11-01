class BaseCreature {
	name: string;
	attack: number;
	defense: number;
	health: number;

	constructor(name: string, attack: number, defense: number, health: number) {
		this.name = name;
		this.attack = attack;
		this.defense = defense;
		this.health = health;
	}
}

let baseCreatures = [
	new BaseCreature('Goblin', 5, 0, 12),
	new BaseCreature('Goblin Chieftain', 7, 3, 20),
	new BaseCreature('Skeleton', 5, 5, 50),
	new BaseCreature('Goblin Champion', 15, 8, 50)
];

class Creature {
	creature:BaseCreature;
	name: string;
	attack: number;
	defense: number;
	health: number;
	x:number;
	y:number;

	constructor(creature:BaseCreature, x:number, y:number) {
		this.creature = creature;
		this.name = creature.name;
		this.attack = creature.attack;
		this.defense = creature.defense;
		this.health = creature.health;
		this.x = x;
		this.y = y;
	}

	drawHealth() {
		displayCreatureHealth(this);
	}
}

function getCreature(search:string | [number,number]) {
	if (typeof search == 'string') {
		return baseCreatures.find(a => a.name == search);
	} else {
		return creatures.find(c => c.x == search[0] && c.y == search[1]);
	}
}

let creatures:Creature[] = [];
