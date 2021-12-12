"use strict";
const GOLD_VALUE = 5;
class Stuff {
    constructor(name, icon, description, colour, count = 0, effect = null) {
        this.name = name;
        this.icon = icon;
        this.description = description;
        this.colour = colour;
        this.count = count;
        this.node = null;
        this.countNode = null;
        this.min = 0;
        this.effect = effect;
    }
    update(newCount = 0) {
        if (this.node === null)
            this.createNode();
        if (this.effect !== null) {
            this.effect(this.count, this.count + newCount);
        }
        this.count += newCount;
        // Ensure we never have 0.9999989 gold.
        this.count = Math.round(this.count * 100) / 100;
        // Check if the number is an integer - if it's not, display one decimal place.
        this.countNode.innerText = writeNumber(this.count, Math.abs(Math.round(this.count) - this.count) < 0.01 ? 0 : 2).replace(/(?<=\d)0$/, "");
        if (this.count > 0) {
            this.countNode.parentNode.style.display = "inline-block";
        }
        this.min = Math.min(this.count, this.min);
        this.displayDescription();
    }
    displayDescription() {
        if (this.description.includes("{}")) {
            const stat = getStat({
                "Iron Axe": "Woodcutting",
                "Iron Pick": "Mining",
                "Iron Hammer": "Smithing",
                // @ts-ignore
            }[this.name]);
            const combatValue = Math.pow(stat.value, 0.01 * this.count);
            if (this.node)
                this.node.querySelector(".description").innerHTML = this.description.replace("{}", writeNumber(combatValue * 100, 1));
        }
    }
    createNode() {
        if (this.node)
            return;
        let stuffTemplate = document.querySelector("#stuff-template");
        if (stuffTemplate === null) {
            throw new Error('No stuff template');
        }
        this.node = stuffTemplate.cloneNode(true);
        this.node.id = "stuff_" + this.name.replace(" ", "_");
        this.node.querySelector(".name").innerHTML = this.name;
        this.node.querySelector(".icon").innerHTML = this.icon;
        this.node.querySelector(".description").innerHTML = this.description.replace("{}", "0");
        this.node.style.color = setContrast(this.colour);
        this.node.style.backgroundColor = this.colour;
        document.querySelector("#stuff-inner").appendChild(this.node);
        this.countNode = this.node.querySelector(".count");
    }
    resetMin() {
        if (this.effect != null) {
            this.min = 0;
        }
        else {
            this.min = this.count;
        }
    }
}
function calcCombatStats() {
    let attack = [];
    attack.push(...Array(getStuff("+1 Sword").count).fill(4));
    attack.push(...Array(getStuff("Steel Sword").count).fill(2));
    attack.push(...Array(getStuff("Iron Sword").count).fill(1));
    attack = attack.slice(0, clones.length).reduce((a, c) => a + c, 0);
    let defense = [];
    defense.push(...Array(getStuff("+1 Shield").count).fill(4));
    defense.push(...Array(getStuff("Steel Shield").count).fill(2));
    defense.push(...Array(getStuff("Iron Shield").count).fill(1));
    defense = defense.slice(0, clones.length).reduce((a, c) => a + c, 0);
    let health = [];
    health.push(...Array(getStuff("+1 Armour").count).fill(25));
    health.push(...Array(getStuff("Steel Armour").count).fill(15));
    health.push(...Array(getStuff("Iron Armour").count).fill(5));
    health = health.slice(0, clones.length).reduce((a, c) => a + c, 0);
    getStat("Attack").setStat(attack);
    getStat("Defense").setStat(defense);
    getStat("Health").setStat(health);
    clones.forEach(c => c.styleDamage());
}
function getStatBonus(name, mult) {
    let stat = getStat(name);
    return (oldAmount, amount) => stat.getBonus((Math.floor(amount + 0.01) - Math.floor(oldAmount + 0.01)) * mult);
}
const stuff = [
    new Stuff("Gold Nugget", "•", "This is probably pretty valuable.  Shiny!", "#ffd700", 0),
    new Stuff("Salt", "⌂", "A pile of salt.  You're not hungry, so what's this good for?", "#ffffff", 0),
    new Stuff("Iron Ore", "•", "A chunck of iron ore.  Not useful in its current form.", "#777777", 0),
    new Stuff("Iron Bar", "❚", "An iron rod.  Has a faint smell of bacon.", "#777777", 0),
    new Stuff("Iron Bridge", "⎶", "A small iron bridge.", "#777777", 0),
    new Stuff("Iron Sword", ")", "An iron sword.  Sharp! (+1 attack)  Max 1 weapon per clone.", "#777777", 0, calcCombatStats),
    new Stuff("Iron Shield", "[", "An iron shield.  This should help you not die. (+1 defense)  Max 1 shield per clone.", "#777777", 0, calcCombatStats),
    new Stuff("Iron Armour", "]", "An suit of iron armour.  This should help you take more hits. (+5 health)  Max 1 armour per clone.", "#777777", 0, calcCombatStats),
    new Stuff("Steel Bar", "❚", "A steel rod.", "#333333", 0),
    new Stuff("Gem", "☼", "A gem, pulled from the ground.  Gives +2.5 (or +2.5%) to Magic.", "#90ee90", 0, getStatBonus("Magic", 2.5)),
    new Stuff("Coal", "○", "A chunk of coal.  Burns hot.", "#222222", 0),
    new Stuff("Steel Bridge", "⎶", "A small steel bridge.", "#222222", 0),
    new Stuff("Steel Sword", ")", "A steel sword.  Sharp! (+2 attack)  Max 1 weapon per clone.", "#222222", 0, calcCombatStats),
    new Stuff("Steel Shield", "[", "A steel shield.  This should help you not die. (+2 defense)  Max 1 shield per clone.", "#222222", 0, calcCombatStats),
    new Stuff("Steel Armour", "]", "A suit of steel armour.  This should help you take more hits. (+15 health)  Max 1 armour per clone.", "#222222", 0, calcCombatStats),
    new Stuff("Iron Axe", "¢", "An iron axe.  Gives +15 or +15% to Woodcutting (whichever is greater), and applies 1% of your Woodcutting skill to combat ({}%).", "#777777", 0, getStatBonus("Woodcutting", 15)),
    new Stuff("Iron Pick", "⛏", "An iron pickaxe.  Gives +15 or +15% to Mining (whichever is greater), and applies 1% of your Mining skill to combat ({}%).", "#777777", 0, getStatBonus("Mining", 15)),
    new Stuff("Iron Hammer", hammerSVG, "An iron hammer.  Gives +15 or +15% to Smithing (whichever is greater), and applies 1% of your Smithing skill to combat ({}%).", "#777777", 0, getStatBonus("Smithing", 15)),
    new Stuff("+1 Sword", ")", "A magical sword.  Sharp! (+4 attack)  Max 1 weapon per clone.", "#688868", 0, calcCombatStats),
    new Stuff("+1 Shield", "[", "A magical shield.  This should help you not die. (+4 defense)  Max 1 shield per clone.", "#688868", 0, calcCombatStats),
    new Stuff("+1 Armour", "]", "A suit of magical armour.  This should help you take more hits. (+25 health)  Max 1 armour per clone.", "#688868", 0, calcCombatStats),
];
function setContrast(colour) {
    const darkness = (parseInt(colour.slice(1, 3), 16) * 299 + parseInt(colour.slice(3, 5), 16) * 587 + parseInt(colour.slice(5, 7), 16) * 114) / 1000;
    return darkness > 125 ? "#000000" : "#ffffff";
}
function setRGBContrast(colour) {
    let colourComponents = [...colour.matchAll(/\d+/g)];
    if (colourComponents.length == 4)
        return "#000000";
    let darkness = (colourComponents[0] * 299 + colourComponents[1] * 587 + colourComponents[2] * 114) / 1000;
    return darkness > 125 ? "#000000" : "#ffffff";
}
function getStuff(name) {
    return stuff.find(a => a.name == name);
}
function displayStuff(node, route) {
    function displaySingleThing(thing) {
        let stuff = getStuff(thing.name);
        return `<span style="color: ${stuff.colour}">${thing.count}${stuff.icon}</span>`;
    }
    if (route.require?.length) {
        node.querySelector(".require").innerHTML = `<span class="actions">${route.actionCount || ""}</span> ` + route.require
            .map(displaySingleThing)
            .join("") + (route instanceof ZoneRoute ? rightArrowSVG : "");
    }
    else {
        let stuffNode = node.querySelector(".require");
        if (stuffNode)
            stuffNode.innerHTML = `<span class="actions">${route.actionCount || ""}</span> `;
    }
    if (route instanceof ZoneRoute && route.stuff.length) {
        node.querySelector(".stuff").innerHTML = route.stuff.map(displaySingleThing).join("");
        if (route.cloneHealth.some(c => c[1] < 0)) {
            node.querySelector(".stuff").innerHTML += `<span style="color: #ff0000">${route.cloneHealth.filter(c => c[1] < 0).length}♥</span>`;
        }
        ;
    }
    else {
        let stuffNode = node.querySelector(".stuff");
        if (stuffNode)
            stuffNode.innerHTML = "";
    }
}
function getEquipHealth(stuff) {
    const equipmentHealth = {
        "Iron Armour": 5,
        "Steel Armour": 15,
        "+1 Armour": 25,
    };
    return stuff.reduce((a, s) => a + (equipmentHealth[s.name] || 0) * s.count, 0);
}
//# sourceMappingURL=stuff.js.map