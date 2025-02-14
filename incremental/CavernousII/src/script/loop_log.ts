// BUGS

class LoopLog {
	actions: { [key in string]: number[] } = {};
	current: boolean = true;
	goldVaporizedCount: number = 0;
	goldVaporizedMana: number = 0;
	kept: boolean = false;
	stats: {current: number, base: number}[];
	queues: string[][] = [];
	constructor(){
		this.stats = stats.map(s => {
			return {
				base: s.base,
				current: s.base,
			};
		});
	}

	addQueueAction(clone: number, actionId: string){
		while (this.queues.length <= clone) {
			this.queues.push([""]);
		}
		this.queues[clone][this.queues[clone].length - 1] += actionId;
	}

	moveZone(){
		this.queues.forEach(q => q.push(""));
	}

	addActionTime(name: string, zone: number, time: number){
		if (!this.actions[name]){
			this.actions[name] = [];
		}
		while (this.actions[name].length <= zone){
			this.actions[name].push(0);
		}
		this.actions[name][zone] += time;
	}

	vaporizeGold(count: number, mana: number){
		this.goldVaporizedCount += count;
		this.goldVaporizedMana += mana;
	}

	finalize(){
		// Don't save 0 length logs.
		if (Object.values(this.actions).reduce((a, c) => a + c.reduce((acc, cur) => acc + cur, 0), 0) < 10) return;
		stats.forEach((s, i) => {
			this.stats[i].current = s.current - this.stats[i].current;
			this.stats[i].base = s.base - this.stats[i].base;
			GrindRoute.updateBestRoute(s.name, this.stats[i].current);
		});
		this.current = false;
		currentLoopLog = new LoopLog();
		previousLoopLogs.push(this);
		const ephemeralLogCount = previousLoopLogs.filter(l => !l.kept).length;
		if (ephemeralLogCount > MAX_EPHEMERAL_LOGS){
			let filtered = false;
			previousLoopLogs = previousLoopLogs.filter(l => filtered || l.kept || ((filtered = true) && false));
		}
		if (displayedLog == this){
			currentLoopLog.display();
		}
	}

	display(zone: number = -1){
		loopLogBox.hidden = false;
		displayedLog = this;
		this.displayActions(zone);
		this.displayStats();
		this.displayHeader(zone);
		displayLogs();
	}

	displayActions(zone: number){
		const loopActionNode = loopLogBox.querySelector("#loop-actions") as HTMLElement;
		while (loopActionNode.lastChild) {
			loopActionNode.removeChild(loopActionNode.lastChild);
		}
		let actions = Object.entries(this.actions);
		if (zone == -1){
			actions.sort((a, b) => b[1].reduce((acc, cur) => acc + cur, 0) - a[1].reduce((acc, cur) => acc + cur, 0));
		} else {
			actions.sort((a, b) => {
				return (b[1][zone]??0) - (a[1][zone]??0);
			});
		}
		const totalActionNode = logEntryTemplate.cloneNode(true) as HTMLElement;
		totalActionNode.querySelector(".name")!.innerHTML = "Total clone-seconds";
		totalActionNode.querySelector(".value")!.innerHTML = writeNumber(actions.reduce((a, c) => a + c[1].reduce((acc, cur) => acc + cur, 0), 0) / 1000, 1);
		totalActionNode.style.fontWeight = "bold";
		loopActionNode.append(totalActionNode);

		for (let i = 0; i < actions.length; i++) {
			const actionValue = (zone == -1 ? actions[i][1].reduce((acc, cur) => acc + cur, 0) : actions[i][1][zone]) / 1000;
			if (actionValue === 0 || !actionValue) continue;
			const node = logEntryTemplate.cloneNode(true) as HTMLElement;
			node.classList.add(actions[i][0].replace(/ /g, "-"));
			node.querySelector(".name")!.innerHTML = actions[i][0];
			node.querySelector(".value")!.innerHTML = writeNumber(actionValue, 1);
			node.querySelector(".description")!.innerHTML = `Relevant stats:<br>${getAction(<anyActionName>actions[i][0])?.stats.map(s => `${s[0].name}: ${s[1]}`).join("<br>") || ""}`;
			loopActionNode.append(node);
			node.style.color = setRGBContrast(window.getComputedStyle(node).backgroundColor);
		}

		// Decide whether a scrollbar is needed
		if (+getComputedStyle(loopActionNode).height.replace("px", "") > +getComputedStyle(document.body).height.replace("px", "") * 0.68){
			loopActionNode.style.overflowY = "auto";
		} else {
			loopActionNode.style.overflowY = "unset";
		}
	}

	displayStats(){
		const loopStatNode = loopLogBox.querySelector("#loop-stats") as HTMLElement;
		while (loopStatNode.lastChild) {
			loopStatNode.removeChild(loopStatNode.lastChild);
		}
		const totalStatNode = statLogEntryTemplate.cloneNode(true) as HTMLElement;
		totalStatNode.querySelector(".name")!.innerHTML = "Total stats gained";
		totalStatNode.style.fontWeight = "bold";
		loopStatNode.append(totalStatNode);
		let totalStats = 0;
		for (let i = 0; i < this.stats.length; i++) {
			if (!stats[i].learnable ||
				(this.stats[i].current == 0 && this !== currentLoopLog) ||
				this.stats[i].current == stats[i].current){
					continue;
			}
			const node = statLogEntryTemplate.cloneNode(true) as HTMLElement;
			node.querySelector(".name")!.innerHTML = stats[i].name;
			if (this.current){
				node.querySelector(".current-value")!.innerHTML = writeNumber(stats[i].current - this.stats[i].current, 3);
				node.querySelector(".base-value")!.innerHTML = writeNumber(stats[i].base - this.stats[i].base, 3);
				totalStats += stats[i].base - this.stats[i].base;
			} else {
				node.querySelector(".current-value")!.innerHTML = writeNumber(this.stats[i].current, 3);
				node.querySelector(".base-value")!.innerHTML = writeNumber(this.stats[i].base, 3);
				totalStats += this.stats[i].base;
			}
			loopStatNode.append(node);
		}
		totalStatNode.querySelector(".base-value")!.innerHTML = writeNumber(totalStats, 3);
	}

	displayHeader(zone: number){
		loopGoldCountNode.innerHTML = this.goldVaporizedCount.toString();
		loopGoldValueNode.innerHTML = writeNumber(this.goldVaporizedMana, 3);
		loadLoopNode.style.display = this.current ? "none" : "inline-block";
		loadLoopNode.onclick = e => {
			longImportQueues(this.queues);
			resetLoop();
		}

		const loopZoneNode = loopLogBox.querySelector("#loop-log-zones") as HTMLElement;
		while (loopZoneNode.lastChild) {
			loopZoneNode.removeChild(loopZoneNode.lastChild);
		}
		let zoneCount = this.queues[0]?.length || 0;

		for (let i = -1; i < zoneCount; i++){
			const zoneNode = loopZoneTemplate.cloneNode(true) as HTMLElement;
			zoneNode.innerHTML = i < 0 ? "All" : `z${i + 1}`;
			if (i == zone) zoneNode.classList.add("active");
			const changeLogZone = ((z) => (e: MouseEvent) => {
				e.stopPropagation();
				this.display(z);
			})(i);
			zoneNode.onmousedown = changeLogZone;
			zoneNode.onmouseup = changeLogZone;
			loopZoneNode.append(zoneNode);
		}
	}
}

let currentLoopLog: LoopLog = new LoopLog();
let previousLoopLogs: LoopLog[] = [];
let displayedLog: LoopLog | null = null;
const loopLogBox = document.querySelector("#loop-log-box") as HTMLElement;
if (loopLogBox === null) throw new Error("No loop log box found");
const logEntryTemplate = document.querySelector("#log-entry-template") as HTMLElement;
logEntryTemplate.removeAttribute("id");
const statLogEntryTemplate = document.querySelector("#stat-log-entry-template") as HTMLElement;
statLogEntryTemplate.removeAttribute("id");
const previousLogTemplate = document.querySelector("#previous-log-template") as HTMLElement;
previousLogTemplate.removeAttribute("id");
const MAX_EPHEMERAL_LOGS = 10;
const loopGoldCountNode = document.querySelector("#loop-gold-count") as HTMLElement;
const loopGoldValueNode = document.querySelector("#loop-gold-value") as HTMLElement;
const loopZoneTemplate = document.querySelector("#loop-zone-template") as HTMLElement;
const loadLoopNode = document.querySelector("#load-loop-log") as HTMLElement;

function displayLogs(){
	const loopPrevNode = loopLogBox.querySelector("#loop-prev-list") as HTMLElement;
	while (loopPrevNode.lastChild) {
		loopPrevNode.removeChild(loopPrevNode.lastChild);
	}

	const node = previousLogTemplate.cloneNode(true) as HTMLElement;
	node.querySelector(".pin")!.classList.add("disabled");
	node.querySelector(".name")!.innerHTML = "Current";
	node.querySelector(".value")!.innerHTML = writeNumber(Object.values(currentLoopLog.actions).reduce((a, c) => a + c.reduce((acc, cur) => acc + cur, 0), 0) / 1000, 1) + " cs";
	node.onclick = e => {
		currentLoopLog.display();
		e.stopPropagation();
		// Visually select the clicked-upon log
	}
	loopPrevNode.append(node);
	for (let i = previousLoopLogs.length - 1; i >= 0; i--){
		let log = previousLoopLogs[i];
		const node = previousLogTemplate.cloneNode(true) as HTMLElement;
		if (log.kept) node.querySelector(".pin")!.classList.add("pinned");
		(node.querySelector(".pin")! as HTMLElement).onmousedown = () => log.kept = !log.kept;
		node.querySelector(".name")!.innerHTML = "Previous";
		node.querySelector(".value")!.innerHTML = writeNumber(Object.values(log.actions).reduce((a, c) => a + c.reduce((acc, cur) => acc + cur, 0), 0) / 1000, 1) + " cs";
		node.onclick = e => {
			log.display();
			e.stopPropagation();
		}
		loopPrevNode.append(node);
	}
}

function hideLoopLog() {
	loopLogBox.hidden = true;
	displayedLog = null;
}
