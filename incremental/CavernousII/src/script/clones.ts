type timeLineEntry = { type: string; time: number; el: HTMLElement };
type timeLine = timeLineEntry[];
let breakActions = false;

class Clone {
	id: number;
	x: number = 0;
	y: number = 0;
	startDamage: number = 0;
	damage: number = 0;
	minHealth: number = 0;
	inCombat: boolean = true;
	isSyncing: boolean | number = false;
	notSyncing: boolean = false;
	remainingTime: number = 0;
	repeated: boolean = false;
	timeLines: timeLine[] = [];
	timeLineElements: HTMLElement[] = [];
	el: HTMLElement | null = null;
	repeatsThisTick: number = 0;
	noActionsAvailable: boolean = false;
	currentCompletions: number | null = null;
	timeAvailable: number = 0;
	occupiedNode: HTMLElement | null = null;
	isPausing: boolean = false;
	nextActionMove: boolean = false;
	isSelected: boolean = false;
	constructor(id: number) {
		this.id = id;
		this.createTimeline();
		this.reset();
		zones.forEach(z => z.queues.push(new ActionQueue(this.id)));
	}

	enterZone() {
		this.x = 0;
		this.y = 0;
		this.startDamage = this.damage;
		this.minHealth = 0;
		this.isSyncing = false;
		this.notSyncing = false;
	}

	reset() {
		this.enterZone();
		this.remainingTime = 0;
		this.damage = 0;
		this.styleDamage();
		this.repeated = false;
		this.resetTimeLine();
	}

	takeDamage(amount: number) {
		if (getStat("Health").current - this.damage > 0.1) {
			this.damage = Math.min(getStat("Health").current - 0.05, this.damage + amount);
		} else {
			this.damage += amount;
		}
		this.minHealth = Math.min(this.minHealth, this.startDamage - this.damage);
		if (this.damage < 0) this.damage = 0;
		if (this.damage >= getStat("Health").current) {
			this.damage = Infinity;
			getMessage("Death").display();
			if (clones.every(c => c.damage == Infinity && c.x == this.x && c.y == this.y)) {
				const route = getBestRoute(this.x, this.y, currentZone);
				if (route) {
					route.allDead = true;
				}
			}
		}
		this.styleDamage();
	}

	styleDamage() {
		if (!this.el) return;
		const hp = 1 - Math.min(this.damage / getStat("Health").current);
		(this.el.querySelector(".damage") as HTMLElement).style.width = hp == 1 || !Number.isFinite(hp) ? "0" : hp * 100 + "%";
		if (hp < 0){
			this.el.classList.add("dead-clone");
		} else {
			this.el.classList.remove("dead-clone");
		}
	}

	writeStats() {
		document.querySelector(".clone-info .health-amount")!.innerHTML = writeNumber(Math.max(getStat("Health").current - this.damage, 0), this.damage ? 2 : 0);
		const lastEntry = this.timeLines[currentZone][this.timeLines[currentZone].length - 1];
		if (lastEntry){
			document.querySelector(".clone-info .action-name")!.innerHTML = lastEntry.type;
			document.querySelector(".clone-info .action-progress")!.innerHTML = writeNumber(this.remainingTime / 1000, 2);
		}
	}

	sync() {
		if (!this.notSyncing) this.isSyncing = true;
	}

	unSync() {
		this.isSyncing = false;
	}

	noSync() {
		this.notSyncing = !this.notSyncing;
	}

	drown(time: number) {
		const location = zones[currentZone].getMapLocation(this.x, this.y, true);
		if (location?.water) this.takeDamage((location.water ** 2 * time) / 1000);
	}

	createTimeline() {
		this.timeLines = [];
		const timelineTemplate = document.querySelector("#timeline-template");
		if (timelineTemplate === null) throw new Error("No timeline template found");

		this.timeLineElements = [];
		for (let i = 0; i < zones.length; i++) {
			this.timeLines[i] = [];
			this.timeLineElements[i] = timelineTemplate.cloneNode(true) as HTMLElement;
			this.timeLineElements[i].id = `zone${i + 1}-timeline${clones.length}`;
		}
		document.querySelector("#timelines")!.append(this.timeLineElements[displayZone]);
	}

	resetTimeLine() {
		for (let i = 0; i < this.timeLines.length; i++) {
			this.timeLines[i] = [];
			const timelineElement = this.timeLineElements[i];
			while (timelineElement.lastChild) {
				timelineElement.removeChild(timelineElement.lastChild);
			}
		}
	}

	addToTimeline(action: { name: string }, time = 0) {
		if (action.name == "None") return;
		if (action === null || time < 1 || isNaN(time)) return;
		// Loop log
		if (!loopActions[action.name]) loopActions[action.name] = Array(zones.length).fill(0);
		loopActions[action.name][currentZone] += time;

		// Timeline
		if (!settings.timeline) return;
		const lastEntry = this.timeLines[currentZone][this.timeLines[currentZone].length - 1];
		if (lastEntry?.type == action.name) {
			lastEntry.time += time;
			lastEntry.el.dataset.time = Math.round(lastEntry.time).toString();
			lastEntry.el.style.flexGrow = lastEntry.time.toString();
		} else {
			const entryElement = document.createElement("div");
			entryElement.dataset.name = action.name;
			entryElement.dataset.time = Math.round(time).toString();
			entryElement.style.flexGrow = time.toString();
			entryElement.classList.add(action.name.replace(/ /g, "-"));
			if (currentZone > 0 && this.timeLines[currentZone].length == 0 && action.name == "No action"){
				this.timeLineElements[currentZone - 1].append(entryElement);
				this.timeLines[currentZone - 1].push({ type: action.name, time, el: entryElement });
			} else {
				this.timeLineElements[currentZone].append(entryElement);
				this.timeLines[currentZone].push({ type: action.name, time, el: entryElement });
			}
		}
	}

	static addNewClone(loading = false) {
		const c = new Clone(clones.length);
		clones.push(c);
		if (!loading) {
			if (clones.length == 2) getMessage("First Clone").display();
			if (clones.length == 3) getMessage("Second Clone").display();
			if (clones.length == 4) getMessage("Third Clone").display();
			if (clones.length == 5) getMessage("Fourth Clone").display();
		}
	}
}

let clones: Clone[] = [];
