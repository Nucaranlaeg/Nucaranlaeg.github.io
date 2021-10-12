class BaseCreature {
	constructor(name, attack, defense, health){
		this.name = name;
		this.attack = attack;
		this.defense = defense;
		this.health = health;
	}
}

let baseCreatures = [
	new BaseCreature("Goblin", 5, 0, 12),
	new BaseCreature("Goblin Chieftain", 7, 3, 20),
	new BaseCreature("Skeleton", 5, 5, 50),
	new BaseCreature("Goblin Champion", 15, 8, 50),
];

class Creature {
	constructor(creature, x, y){
		this.creature = creature;
		this.name = creature.name;
		this.attack = creature.attack;
		this.defense = creature.defense;
		this.health = creature.health;
		this.x = x;
		this.y = y;
	}

	drawHealth(){
		displayCreatureHealth(this);
	}
}

let creatures = [];
