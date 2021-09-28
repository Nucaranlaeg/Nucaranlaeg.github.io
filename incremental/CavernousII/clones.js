class Clone {
	constructor(id){
		this.id = id;
		this.reset();
		this.createQueue();
	}

	enterZone() {
		this.x = 0;
		this.y = 0;
		this.walkTime = 0;
		this.startDamage = this.damage;
		this.minHealth = 0;
		this.waiting = false;
	}

	reset() {
		this.enterZone();
		this.currentProgress = 0;
		this.damage = 0;
		this.styleDamage();
		this.repeated = false;
		this.walkTime = 0;
		this.activeSpells = [];
		this.waiting = false;
	}

	takeDamage(amount) {
		if (this.activeSpells.find(spell => spell.name == "Arcane Shield") && amount > 0){
			let mana = getStat("Mana");
			if (mana.current < amount){
				mana.spendMana(mana.current);
				amount -= mana.current;
			} else {
				mana.spendMana(amount);
				amount = 0;
			}
		}
		if (getStat("Health").current - this.damage > 0.1){
			this.damage = Math.min(getStat("Health").current - 0.05, this.damage + amount);
		} else {
			this.damage += amount;
		}
		this.minHealth = Math.min(this.minHealth, this.startDamage - this.damage);
		if (this.damage < 0) this.damage = 0;
		if (this.damage >= getStat("Health").current){
			this.damage = Infinity;
			getMessage("Death").display();
			if (clones.every(c => c.damage == Infinity && c.x == this.x && c.y == this.y)){
				let route = getBestRoute(this.x, this.y, currentZone);
				if (route){
					route.allDead = true;
				}
			}
		}
		this.styleDamage();
	}

	styleDamage() {
		if (!this.el) return;
		let hp = 1 - Math.min((this.damage / getStat("Health").current));
		this.el.querySelector(".damage").style.width = hp == 1 || !Number.isFinite(hp) ? "0" : (hp * 100) + "%";
		if (hp < 0) this.el.classList.add('dead-clone');
		else this.el.classList.remove('dead-clone');
	}

	createQueue() {
		let queueTemplate = document.querySelector("#queue-template");
		this.el = queueTemplate.cloneNode(true);
		this.el.id = `queue${clones.length}`;
		document.querySelector("#queues").append(this.el);
		let q = new ActionQueue();
		q.index = queues.length;
		queues.push(q);
	}

	select(allowMultiple = false) {
		if (!allowMultiple) {
			for (let index of selectedQueue) {
				if (index != this.id) clones[index].deselect();
			}
			if (cursor[0] != this.id){
				cursor = [this.id, null];
			}
			selectedQueue = [this.id];
		} else {
			cursor = [0, null];
		}

		document.querySelector(`#queue${this.id}`).classList.add("selected-clone");
		if (!selectedQueue.includes(this.id)) {
			selectedQueue.push(this.id)
		}

	}

	deselect() {
		document.querySelector(`#queue${this.id}`).classList.remove("selected-clone");
		if (cursor[0] == this.id)
			cursor[1] = null;
		selectedQueue = selectedQueue.filter(e => e != this.id);
	}

	completeNextAction(force) {
		return completeNextAction(force);
	}

	selectQueueAction(actionIndex, n) {
		if (currentZone == displayZone) return selectQueueAction(this.id, actionIndex, n);
	}

	sustainSpells(time) {
		this.activeSpells.forEach(s => s.sustain(time));
	}

	drown(time) {
		let location = zones[currentZone].getMapLocation(this.x, this.y, true);
		this.takeDamage(location.water ** 2 * time / 1000);
	}

	executeAction(time, action, actionIndex) {
		currentClone = this.id;
		let actionToDo = action.action;
		// Failed pathfind
		if (actionToDo === null || actionToDo[0] === undefined){
			this.completeNextAction(true);
			return time;
		}

		let actionXOffset = {
			"R": 1,
			"L": -1,
		}[actionToDo[0]] || 0;
		let actionYOffset = {
			"U": -1,
			"D": 1,
		}[actionToDo[0]] || 0;
		let hasOffset = !!actionXOffset || !!actionYOffset;

		if (actionToDo[0][0] == "N"){
			if (runes[actionToDo[1]].create(this.x + actionXOffset, this.y + actionYOffset)){
				this.selectQueueAction(actionIndex, 100);
				this.completeNextAction();
				return time;
			} else {
				return 0;
			}
		}
		if (actionToDo[0][0] == "S"){
			if (spells[actionToDo[1]].cast()){
				this.selectQueueAction(actionIndex, 100);
				this.completeNextAction();
				return time;
			} else {
				return 0;
			}
		}
		if (actionToDo == "<") {
			this.completeNextAction();
			return time;
		}
		if (actionToDo == "=") {
			this.waiting = true;
			if (clones.every((c, i) => {
					return (c.waiting === true || (c.waiting && c.waiting >= queueTime - (settings.debug_maxSingleTickTime || 99) * 5)) || !queues[i].find(q => q[0] == "=" && q[1])
				})){
				this.waiting = queueTime;
				this.selectQueueAction(actionIndex, 100);
				this.completeNextAction();
				return time;
			}
			return 0;
		}

		let location = getMapLocation(this.x + actionXOffset, this.y + actionYOffset);
		if (this.currentCompletions === null) this.currentCompletions = location.completions;

		if ((!hasOffset && location.canWorkTogether && this.currentProgress
					&& (this.currentProgress < location.remainingPresent || location.remainingPresent == 0))
				|| (!hasOffset && this.currentCompletions !== null && this.currentCompletions < location.completions)) {
			this.completeNextAction();
			this.currentProgress = 0;
			this.selectQueueAction(actionIndex, 100);
			return time;
		}
		if ((location.remainingPresent <= 0 && !hasOffset) || (location.remainingEnter <= 0 && hasOffset)) {
			let startStatus = location.start();
			if (startStatus == 0){
				this.completeNextAction();
				this.currentProgress = 0;
				this.selectQueueAction(actionIndex, 100);
				return time;
			} else if (startStatus < 0){
				return 0;
			}
		}
		let percentRemaining;
		[time, percentRemaining] = location.tick(time);
		this.selectQueueAction(actionIndex, 100 - (percentRemaining * 100));
		this.currentProgress = location.remainingPresent;
		if (!percentRemaining){
			this.completeNextAction();
			this.currentProgress = 0;
		}
		return time;
	}

	get queue() {
		return queues[this.id];
	}

	performSingleAction(time = this.timeAvailable) {
		if (time <= 0 || this.noActionsAvailable || this.damage == Infinity) return 0;
		currentClone = this.id;
		let [nextAction, actionIndex] = getNextAction();
		this.timeAvailable = time;

		if (nextAction) {
			let startTime = time;
			time = this.executeAction(time, nextAction, actionIndex);
			this.sustainSpells(startTime - time);
			this.drown(startTime - time);
			this.timeAvailable = time;
			return time;
		} 

		let repeat = this.queue.findIndex(q => q[0] == "<");
		if (repeat > -1 && this.repeatsThisTick < 10) {
			this.repeated = true;
			this.repeatsThisTick++;
			for (let i = repeat + 1; i < this.queue.length; i++){
				this.queue[i][1] = true;
				if (this.queue[i][2]){
					for (let inner of this.queue[i][2]) {
						delete inner[`${currentClone}_${i}`];
					}
				}
				this.selectQueueAction(i, 0);
			}
			this.drown(this.timeAvailable - time);
			this.timeAvailable = time;
			return time;
		}
	
		this.timeLeft = time;
		this.noActionsAvailable = true;
		this.drown(this.timeAvailable);
		this.timeAvailable = 0;
		return 0;
	}

	setTimeAvalable(time) {
		this.timeLeft = 0;
		this.timeAvailable = time;
		this.noActionsAvailable = false;
		this.repeatsThisTick = 0;
	}

	static performActions(time) {
		let maxSingleTickTime = settings.debug_maxSingleTickTime || 99;
		let goldToManaBaseTime = getAction("Turn Gold to Mana").getDuration() / clones.length * 1000;
		if (maxSingleTickTime > goldToManaBaseTime / 2) {
			maxSingleTickTime = goldToManaBaseTime / 2;
		}
		while (time > maxSingleTickTime) {
			let leftover = this.performActions(maxSingleTickTime);
			time -= maxSingleTickTime;
			if (leftover) {
				time += leftover;
				return time;
			}
		}

		for (let c of clones) {
			c.setTimeAvalable(time);
		}
		let maxTime = time;
		while(maxTime) {
			for (let c of clones) {
				if (c.noActionsAvailable) continue;
				if (c.timeAvailable == maxTime) {
					c.performSingleAction();
				}
			}
			maxTime = Math.max(...clones.map(e => !e.noActionsAvailable && e.damage != Infinity && (e.timeAvailable || 0)));
			if (maxTime < 0.001) break;
		}
		let timeNotSpent = Math.min(...clones.map(e => e.timeLeft || 0));
		clones.forEach(c => {
			if (c.timeLeft > timeNotSpent) c.sustainSpells(c.timeLeft - timeNotSpent);
		})
		queueTime += time - timeNotSpent;
		getStat("Mana").spendMana((time - timeNotSpent) / 1000);
		return timeNotSpent;
	}

	static addNewClone(loading = false) {
		let c = new Clone(clones.length);
		clones.push(c);
		if (!loading){
			if (clones.length == 2) getMessage("First Clone").display();
			if (clones.length == 3) getMessage("Second Clone").display();
			if (clones.length == 4) getMessage("Third Clone").display();
			if (clones.length == 4) getMessage("Fourth Clone").display();
		}
	}
}

function selectClone(target, event){
	if (target.id) {
		let index = +target.id.replace("queue", "");
		if (event && event.ctrlKey) {
			if (selectedQueue.includes(index)) {
				clones[index].deselect();
			} else {
				clones[index].select(true);
			}
		} else {
			clones[index].select();
		}
	} else {
		clones[target].select();
	}
	
	showCursor();
	showFinalLocation();
}

let clones = [];
