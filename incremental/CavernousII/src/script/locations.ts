class MapLocation<basetypeName extends anyLocationTypeName = anyLocationTypeName> {
	x: number;
	y: number;
	zone: Zone;
	baseType: LocationType<basetypeName>;
	creature: Creature | null;
	priorCompletionData: any[];
	completions: number;
	entered: number;
	remainingEnter: number;
	remainingPresent: number;
	enterDuration: number;
	presentDuration: number;
	temporaryPresent: Action | null;
	wither: number;
	water: any;
	usedTime: any;
	constructor(x: number, y: number, zone: Zone, type: basetypeName){
		this.x = x;
		this.y = y;
		this.zone = zone;
		this.baseType = getLocationType(type);
		const creature = getCreature(type);
		if (creature) {
			this.creature = new Creature(creature, x, y);
			creatures.push(this.creature);
		} else {
			this.creature = null
		}
		this.priorCompletionData = Array(realms.length).fill(0);
		this.completions = 0;
		this.entered = 0;
		this.remainingEnter = 0;
		this.remainingPresent = 0;
		this.enterDuration = 0;
		this.presentDuration = 0;
		this.temporaryPresent = null;
		this.wither = 0;
		this.water = this.type.startWater;
	}

	get priorCompletions() {
		return this.priorCompletionData[currentRealm];
	}

	get type(): LocationType<anyLocationTypeName> {
		if (currentRealm === 2){
			const symbol = verdantMapping[this.baseType.symbol];
			if (symbol){
				return getLocationType(getLocationTypeBySymbol(symbol) || '') || this.baseType;
			}
		}
		return this.baseType;
	}

	start() {
		if (clones[currentClone].x == this.x && clones[currentClone].y == this.y){
			if (this.type.presentAction){
				this.remainingPresent = this.type.presentAction.start(this.completions, this.priorCompletions, this.x, this.y);
			} else if (this.temporaryPresent){
				this.remainingPresent = this.temporaryPresent.start(this.completions, this.priorCompletions, this.x, this.y);
			} else {
				return false;
			}
			this.presentDuration = this.remainingPresent;
			return this.remainingPresent;
		}
		const enterAction = this.type.getEnterAction(this.entered);
		if (!enterAction) return false;
		clones[currentClone].walkTime = 0;
		this.remainingEnter = enterAction.start(this.completions, this.priorCompletions, this.x, this.y);
		if (this.remainingEnter !== -1){
			this.remainingEnter = Math.max(Object.create(getAction("Walk")).start(this.completions, this.priorCompletions, this.x, this.y), this.remainingEnter - this.wither);
		}
		this.enterDuration = this.remainingEnter;
		return this.remainingEnter;
	}

	tick(time: number) {
		let usedTime; let percent;
		if (clones[currentClone].x == this.x && clones[currentClone].y == this.y){
			const action = (this.type.presentAction || this.temporaryPresent)!;
			const skillDiv = action.getSkillDiv();
			usedTime = Math.min(time / skillDiv, this.remainingPresent);
			action.tick(usedTime, {x: this.x, y: this.y} as Creature, usedTime * skillDiv);
			this.remainingPresent -= usedTime;
			if (this.remainingPresent == 0){
				if (action.complete(this.x, this.y)){
					// Something got taken away in the middle of completing this.
					this.remainingPresent = 100;
					this.usedTime = time;
				} else {
					if (this.type.canWorkTogether){
						this.completions++;
					}
				}
			}
			percent = this.remainingPresent / (this.presentDuration || 1);
			// Don't pass back effective time.
			usedTime *= skillDiv;
		} else {
			if (["Walk", "Kudzu Chop"].includes(this.type.getEnterAction(this.entered)!.name)){
				if (!clones[currentClone].walkTime){
					// Second and following entrances
					clones[currentClone].walkTime = this.type.getEnterAction(this.entered)!.start(this.completions, this.priorCompletions, this.x, this.y);
				}
				this.remainingEnter = clones[currentClone].walkTime;
			} else {
				clones[currentClone].walkTime = 0;
			}
			const skillDiv = this.type.getEnterAction(this.entered).getSkillDiv();
			usedTime = Math.min(time / skillDiv, this.remainingEnter);
			this.type.getEnterAction(this.entered).tick(usedTime, this.creature, usedTime * skillDiv);
			this.remainingEnter -= usedTime;
			if (this.remainingEnter == 0){
				if (this.type.getEnterAction(this.entered).complete(this.x, this.y, this.creature)){
					if (this.type.name == "Goblin") getMessage("Goblin").display();
					// If it was a fight it's not over.
					if (this.creature){
						this.start();
					} else {
						loopCompletions++;
						this.remainingEnter = 1;
						this.usedTime = time;
					}
				} else {
					loopCompletions++;
					this.entered++;
				}
			}
			percent = this.remainingEnter / (this.enterDuration || 1);
			if (["Walk", "Kudzu Chop"].includes(this.type.getEnterAction(this.entered).name)) this.remainingEnter = baseWalkLength();
			// Don't pass back effective time.
			usedTime *= skillDiv;
		}
		return [time - usedTime, percent];
	}

	setTemporaryPresent(rune: Rune) {
		if (this.type.presentAction){
			return false;
		}
		this.temporaryPresent = getAction(rune.activateAction);
		return true;
	}

	reset() {
		this.priorCompletionData[currentRealm] = this.type.reset(this.completions, this.priorCompletions);
		this.completions = 0;
		this.entered = 0;
		this.remainingEnter = 0;
		this.remainingPresent = 0;
		this.temporaryPresent = null;
		this.wither = 0;
		this.water = this.type.startWater;
	}

	zoneTick(time:number) {
		if (!this.water) return;
		// [tile, loc] is actually [mapChar, MapLocation] but ts doesn't provide a way to typehint that.  Or it's just bad at complex types.
		zones[currentZone].getAdjLocations(this.x, this.y).forEach(([tile, loc]: any) => {
			if (!walkable.includes(tile) && !shrooms.includes(tile)) return;
			const prev_level = Math.floor(loc.water * 10);
			// 1 water should add 0.04 water per second to each adjacent location.
			loc.water = Math.min(Math.max(this.water, loc.water), loc.water + (this.water / 158 / (shrooms.includes(tile) ? 2 : 1)) ** 2 * time);
			if (prev_level != Math.floor(loc.water * 10)){
				mapDirt.push([loc.x + zones[currentZone].xOffset, loc.y + zones[currentZone].yOffset]);
			}
		});
	}
}
