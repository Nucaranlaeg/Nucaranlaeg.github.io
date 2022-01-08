"use strict";
let currentRealm = 0;
class Realm {
    constructor(name, description, getMachineCount = null, activateMachine = null, extraDescription = null, multPerRock = 0, maxMult = Infinity) {
        this.locked = true;
        this.index = -1;
        this.mult = null;
        this.machineCompletions = 0;
        this.completed = false;
        this.name = name;
        this.description = description;
        this.getMachineCount = getMachineCount ?? (() => Infinity);
        this.activateMachine = activateMachine || (() => { });
        this.extraDescription = extraDescription;
        this.multPerRock = multPerRock;
        this.node = null;
        this.maxMult = maxMult;
        setTimeout(() => {
            this.index = realms.findIndex(r => r == this);
        });
    }
    unlock() {
        this.locked = false;
        this.display();
    }
    complete() {
        this.completed = true;
        this.node?.parentNode?.removeChild(this.node);
        routes = routes.filter(r => r.realm !== this.index);
        zones.forEach(z => z.routes = z.routes.filter(r => r.realm !== this.index));
        grindRoutes = grindRoutes.filter(r => r.realm !== this.index);
    }
    display() {
        if (!this.node && !this.completed) {
            const realmTemplate = document.querySelector("#realm-template");
            if (realmTemplate === null)
                throw new Error("No realm template found");
            this.node = realmTemplate.cloneNode(true);
            this.node.removeAttribute("id");
            this.node.querySelector(".name").innerHTML = this.name;
            this.node.querySelector(".description").innerHTML = this.description + '<div class="extra-description"></div>';
            let realmSelect = document.querySelector("#realm-select");
            if (realmSelect === null)
                throw new Error("No realm select found");
            realmSelect.appendChild(this.node);
            this.node.onclick = () => {
                if (settings.grindStats)
                    toggleGrindStats();
                if (settings.grindMana)
                    toggleGrindMana();
                changeRealms(this.index);
            };
            if (this.extraDescription) {
                this.node.onmouseover = () => {
                    this.node.querySelector(".extra-description").innerHTML = this.extraDescription();
                };
            }
        }
    }
    getNextActivateAmount() {
        return this.getMachineCount() == 1 ? 1 : 5 * Math.pow(2, this.getMachineCount() - 1);
    }
}
function changeRealms(newRealm) {
    if (realms[newRealm].completed)
        return;
    // Reset the zones first to apply mana gained to the appropriate realm.
    zones.forEach(z => z.resetZone());
    resetLoop(true, false);
    currentRealm = newRealm;
    zones.forEach(z => (z.routesChanged = true));
    recalculateMana();
    runes.forEach(r => r.updateDescription());
    let realmSelect = document.querySelector("#realm-select");
    if (realmSelect === null)
        throw new Error("No realm select found");
    let currentActiveRealm = realmSelect.querySelector(".active-realm");
    if (currentActiveRealm)
        currentActiveRealm.classList.remove("active-realm");
    realms[newRealm].node?.classList.add("active-realm");
    document.querySelector("#queue-actions").style.display = currentRealm == 3 ? "block" : "none";
    resetLoop();
}
function getRealmMult(name, force = false) {
    const realm = getRealm(name);
    if (realm.mult === undefined || realm.mult === null || force) {
        realm.mult =
            zones.reduce((a, z) => {
                return (a +
                    z.mapLocations
                        .flat()
                        .filter(l => l.type.name == "Mana-infused Rock")
                        .reduce((a, c) => a + c.priorCompletionData[realm.index], 0));
            }, 0) * realm.multPerRock;
    }
    return Math.min(realm.mult + 1, realm.maxMult);
}
function getVerdantMultDesc() {
    return `Total multiplier: x${writeNumber(getRealmMult("Verdant Realm", true), 4)}`;
}
function getCompoundingMultDesc() {
    return `Stat slowdown start: ${writeNumber(99 + getRealmMult("Compounding Realm", true), 4)}`;
}
function getRealmComplete(realm) {
    if (realm.name == "Verdant Realm") {
        const wither = getRune("Wither");
        if ((getRealmMult(realm.name, true) == realm.maxMult && wither.upgradeCount >= 3) || realm.completed) {
            realm.complete();
            getMessage("Complete Verdant").display();
            wither.upgradeCount = 3;
            wither.isInscribable = simpleRequire([["Salt", 1], ["Iron Ore", 1]]);
            wither.updateDescription();
        }
    }
}
const verdantMapping = {
    "#": "♠",
    "√": "♠",
    "«": "♣",
    "╖": "α",
    "╣": "§",
    "■": "δ", // Chert -> Springshroom (you can't get here, but still...)
};
function convertMapToVerdant(map, zoneNumber) {
    return map.map(row => [...row].map(cell => zoneNumber > 6 ? "█" : (zoneNumber == 6 && cell == "Θ" ? "♠" : verdantMapping[cell] || cell)).join(""));
}
const realms = [
    // Default realm, no special effects.
    new Realm("Core Realm", "Where you started.  Hopefully, how you'll leave this cave complex.", () => clones.length, () => Clone.addNewClone()),
    // Double mana cost on everything.
    // All stuff costs except for making bars and vaporizing gold is doubled.
    new Realm("Long Realm", "A realm where everything takes thrice as long and costs twice as much (except bars and vaporizing gold).  It will help you slow down how quickly mana rocks become harder to mine.", () => (getRune("Duplication").upgradeCount || 0) + 3, () => {
        getRune("Duplication").upgradeCount++;
        getRune("Duplication").updateDescription();
        getMessage("Upgraded Duplication Rune").display(true);
    }),
    // All rock-type locations become mushroom-type locations.
    // Mushroom growth rate is doubled.
    new Realm("Verdant Realm", "A realm where mushrooms have overgrown everything, and they grow five times as fast.  You'll learn how to get mana from gold more efficiently (0.05% per mana rock completion).", () => (getRune("Wither").upgradeCount || 0) > 2 ? Infinity : (getRune("Wither").upgradeCount || 0) + 3, () => {
        if (getRune("Wither").upgradeCount++ >= 1) {
            getMessage("Reupgraded Wither Rune").display();
        }
        getRune("Wither").updateDescription();
        getMessage("Upgraded Wither Rune").display();
    }, getVerdantMultDesc, 0.0005, 2),
    // Clones cannot help each other at all.
    new Realm("Compounding Realm", "A realm where things get harder the more you do.  Each movement action completed (including walking - and pathfinding doesn't save you on that) increases the amount of time each subsequent task will take by 2.5%.  You'll get better at learning from repeated tasks (stat slowdown will start 0.1 points later per mana rock completion and you'll gain base 0.1% faster).", () => getRealm("Compounding Realm").machineCompletions + 2, () => {
        getRealm("Compounding Realm").machineCompletions++;
        getMessage("Time Barriers").display();
    }, getCompoundingMultDesc, 0.1)
];
function getRealm(name) {
    let realm = realms.find(a => a.name == name);
    if (realm === undefined)
        throw new Error(`No realm with name "${name}" found`);
    return realm;
}
//# sourceMappingURL=realms.js.map