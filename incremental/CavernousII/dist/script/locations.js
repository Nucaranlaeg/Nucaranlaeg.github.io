"use strict";
class MapLocation {
    constructor(x, y, zone, type) {
        this.activeEnter = null;
        this.activePresent = null;
        this.x = x;
        this.y = y;
        this.zone = zone;
        this.baseType = getLocationType(type);
        const creature = getCreature(type);
        if (creature) {
            this.creature = new Creature(creature, x, y);
            creatures.push(this.creature);
        }
        else {
            this.creature = null;
        }
        this.priorCompletionData = Array(realms.length).fill(0);
        this.completions = 0;
        this.entered = 0;
        this.temporaryPresent = null;
        this.wither = 0;
        this.water = this.type.startWater;
    }
    get priorCompletions() {
        return this.priorCompletionData[currentRealm];
    }
    get type() {
        if (currentRealm === 2) {
            const symbol = verdantMapping[this.baseType.symbol];
            if (symbol) {
                return getLocationType(getLocationTypeBySymbol(symbol) || '') || this.baseType;
            }
        }
        return this.baseType;
    }
    getEnterAction() {
        if (this.activeEnter?.remainingDuration == 0)
            this.activeEnter = null;
        const action = this.type.getEnterAction(this.entered);
        if (action == null)
            return null;
        if (this.type.canWorkTogether && action.name != "Walk") {
            if (this.activeEnter === null)
                this.activeEnter = new ActionInstance(action, this, true);
            return this.activeEnter;
        }
        return new ActionInstance(action, this, true);
    }
    getPresentAction() {
        if (this.activePresent?.remainingDuration == 0)
            this.activePresent = null;
        if (this.type.canWorkTogether) {
            if (this.activePresent !== null)
                return this.activePresent;
            if (this.type.presentAction) {
                this.activePresent = new ActionInstance(this.type.presentAction, this, false);
            }
            else if (this.temporaryPresent) {
                this.activePresent = new ActionInstance(this.temporaryPresent, this, false);
            }
            else {
                return null;
            }
            return this.activePresent;
        }
        if (this.type.presentAction) {
            return new ActionInstance(this.type.presentAction, this, false);
        }
        else if (this.temporaryPresent) {
            return new ActionInstance(this.temporaryPresent, this, false);
        }
        else {
            return null;
        }
    }
    setTemporaryPresent(rune) {
        if (this.type.presentAction) {
            return false;
        }
        this.temporaryPresent = getAction(rune.activateAction);
        return true;
    }
    reset() {
        this.priorCompletionData[currentRealm] = this.type.reset(this.completions, this.priorCompletions);
        this.completions = 0;
        this.entered = 0;
        this.temporaryPresent = null;
        this.wither = 0;
        this.water = this.type.startWater;
        this.activeEnter = null;
        this.activePresent = null;
    }
    zoneTick(time) {
        if (this.temporaryPresent?.name == "Pump") {
            const pumpAmount = Math.log2(getStat("Runic Lore").current) / 25 * time / 1000;
            if (this.water > 0.1)
                mapDirt.push([this.x, this.y]);
            this.water = Math.max(0, this.water - pumpAmount);
            // [tile, loc] is actually [mapChar, MapLocation] but ts doesn't provide a way to typehint that.  Or it's just bad at complex types.
            zones[currentZone].getAdjLocations(this.x, this.y).forEach(([tile, loc]) => {
                if (!loc || !loc.water)
                    return;
                const prev_level = Math.floor(loc.water * 10);
                loc.water = Math.max(0, loc.water - (pumpAmount / 4));
                if (prev_level != Math.floor(loc.water * 10)) {
                    mapDirt.push([loc.x + zones[currentZone].xOffset, loc.y + zones[currentZone].yOffset]);
                }
            });
        }
        if (!this.water)
            return;
        if (this.baseType.name == "Springshroom" && !this.entered) {
            // Sporeshrooms add 0.2 water per second at 0 water, 0.05 at 1 water, and it drops off quadratically.
            this.water = this.water + time / 1000 * 0.2 / ((1 + this.water) ** 2);
        }
        // [tile, loc] is actually [mapChar, MapLocation] but ts doesn't provide a way to typehint that.  Or it's just bad at complex types.
        zones[currentZone].getAdjLocations(this.x, this.y).forEach(([tile, loc]) => {
            if (!loc)
                return;
            if (!walkable.includes(tile) && !shrooms.includes(tile))
                return;
            const prev_level = Math.floor(loc.water * 10);
            // 1 water should add 0.04 water per second to each adjacent location.
            loc.water = Math.min(Math.max(this.water, loc.water), loc.water + (this.water / 158 / (shrooms.includes(tile) ? 2 : 1)) ** 2 * time);
            if (prev_level != Math.floor(loc.water * 10)) {
                mapDirt.push([loc.x + zones[currentZone].xOffset, loc.y + zones[currentZone].yOffset]);
            }
        });
    }
}
//# sourceMappingURL=locations.js.map