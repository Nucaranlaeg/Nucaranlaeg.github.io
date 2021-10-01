class Location {
	constructor(x, y, zone, type){
		this.x = x;
		this.y = y;
		this.zone = zone;
		this.baseType = getLocationType(type);
		let creature = getCreature(type);
		if (creature) {
			this.creature = new Creature(creature, x, y);
			creatures.push(this.creature);
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

	get type() {
		if (currentRealm != 2) return this.baseType;
		if (verdantMapping[this.baseType.symbol]){
			return getLocationType(getLocationTypeBySymbol(verdantMapping[this.baseType.symbol]));
		}
		return this.baseType;
	}
	
	start() {
		if (clones[currentClone].x == this.x && clones[currentClone].y == this.y){
			if (this.type.presentAction){
				this.remainingPresent = this.type.presentAction.start(this.completions, this.priorCompletions, this.x, this.y);
			} else if (this.temporaryPresent){
				this.remainingPresent = this.temporaryPresent.start(this.completions, this.priorCompletions);
			} else {
				return false;
			}
			this.presentDuration = this.remainingPresent;
			return this.remainingPresent;
		}
		let enterAction = this.type.getEnterAction(this.entered);
		if (!enterAction) return false;
		clones[currentClone].walkTime = 0;
		this.remainingEnter = enterAction.start();
		if (this.remainingEnter !== -1){
			this.remainingEnter = Math.max(Object.create(getAction("Walk")).start(), this.remainingEnter - this.wither);
		}
		this.enterDuration = this.remainingEnter;
		return this.remainingEnter;
	}
	
	tick(time) {
		let usedTime, percent;
		if (clones[currentClone].x == this.x && clones[currentClone].y == this.y){
			let skillDiv = (this.type.presentAction || this.temporaryPresent).getSkillDiv();
			usedTime = Math.min(time / skillDiv, this.remainingPresent);
			(this.type.presentAction || this.temporaryPresent).tick(usedTime, {x: this.x, y: this.y}, usedTime * skillDiv);
			this.remainingPresent -= usedTime;
			if (this.remainingPresent == 0){
				if ((this.type.presentAction || this.temporaryPresent).complete(this.x, this.y)){
					// Something got taken away in the middle of completing this.
					this.remainingPresent = this.type.name == "Fountain" ? 100 : 1;
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
			if (["Walk", "Kudzu Chop"].includes(this.type.getEnterAction(this.entered).name)){
				if (!clones[currentClone].walkTime){
					// Not sure why this is happening... walktime should be set when start() is called the first time.
					this.start();
				}
				this.remainingEnter = clones[currentClone].walkTime;
			}
			let skillDiv = this.type.getEnterAction(this.entered).getSkillDiv();
			usedTime = Math.min(time / skillDiv, this.remainingEnter);
			this.type.getEnterAction(this.entered).tick(usedTime, this.creature, usedTime * skillDiv);
			this.remainingEnter -= usedTime;
			if (this.remainingEnter == 0){
				if (this.type.getEnterAction(this.entered).complete(this.x, this.y, this.creature)){
					if (this.type.name == "Goblin") getMessage("Goblin").display();
					// If it was a fight it's not over.
					if (this.creature){
						this.remainingEnter = this.start();
					} else {
						this.remainingEnter = 1;
						this.usedTime = time;
					}
				} else {
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

	setTemporaryPresent(rune) {
		if (this.type.presentAction) return false;
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

	zoneTick(time) {
		if (!this.water) return;
		zones[currentZone].getAdjLocations(this.x, this.y).forEach(([tile, loc]) => {
			if (!walkable.includes(tile)) return;
			let prev_level = Math.floor(loc.water * 10);
			// 1 water should add 0.04 water per second to each adjacent location.
			loc.water = Math.min(1, loc.water + (this.water / 158) ** 2 * time);
			if (prev_level != Math.floor(loc.water * 10)){
				mapDirt.push([loc.x + zones[currentZone].xOffset, loc.y + zones[currentZone].yOffset]);
			}
		});
	}
}
