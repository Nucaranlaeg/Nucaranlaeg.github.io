class GrindRoute {
	statName!: anyStatName;
	totalStatGain!: number;
	totalTime!: number;
	projectedGain!: number;
	realm!: number;
	route!: any[];
	tried = true;
	failed = false;

	constructor(x: anyStatName, totalStatGain:number)
	constructor(x: PropertiesOf<GrindRoute>)
	constructor(x: anyStatName | PropertiesOf<GrindRoute>, totalStatGain = 0) {
		if (typeof x !== "string") {
			Object.assign(this, x);
			return;
		}
		this.statName = x;
		this.totalStatGain = totalStatGain;
		this.totalTime = queueTime;
		this.projectedGain = GrindRoute.calculateProjectedGain(this.statName, this.totalStatGain);
		// Don't save routes for stats which aren't learnable.
		if (!getStat(x).learnable) this.projectedGain = -Infinity;

		this.realm = currentRealm;
		this.route = zones.map(z => z.node ? z.queues.map(queue => queue.toString()) : "").filter(q => q);
	}

	loadRoute(){
		if (this.realm !== currentRealm) changeRealms(this.realm);
		this.route.forEach((q:string, i:number) => {
			zones[i].queues.map(e => e.clear());
			for (let j = 0; j < zones[i].queues.length; j++) {
				zones[i].queues[j].fromString(q[j] || q[q.length - 1]);
			}
		});
		redrawQueues();
	}

	isLoaded(){
		return this.route.toString() === zones.map(z => z.node ? z.queues.map(queue => queue.toString()) : "").filter(q => q).toString();
	}

	static calculateProjectedGain(pStatName:anyStatName, pTotalStatGain:number) {
		const scalingStart = 99 + getRealmMult("Compounding Realm");
		const stat = getStat(pStatName);
		const val = (stat.base + pTotalStatGain + 1) ** (0.9 * (stat.base > scalingStart ? scalingStart / stat.base : 1) ** 0.05) - (stat.base + 1);
		const prevVal = (stat.base + 1) ** (0.9 * (stat.base > scalingStart ? scalingStart / stat.base : 1) ** 0.05) - (stat.base + 1);
		return val < 0 ? 0 : (val - (prevVal < 0 ? 0 : prevVal)) / stat.statIncreaseDivisor * (0.99 + getRealmMult("Compounding Realm") / 100);
	}

	static getBestRoute(stat:anyStatName) {
		return grindRoutes.find(r => r.statName === stat);
	}

	static updateBestRoute(stat: anyStatName, totalStatGain: number) {
		if (stat === "Mana" || !totalStatGain) return;
		const prev = GrindRoute.getBestRoute(stat);
		if (settings.statGrindPerSec){
			// Replace stat grind routes if they're better in gain per second
			if (!prev || totalStatGain / queueTime > prev.totalStatGain / prev.totalTime){
				grindRoutes = grindRoutes.filter(e => e.statName !== stat);
				grindRoutes.push(new GrindRoute(stat, totalStatGain || 0));
			} else {
				prev.projectedGain = GrindRoute.calculateProjectedGain(prev.statName, prev.totalStatGain);
			}
		} else {
			// Replace stat grind routes if they're better absolute value-wise
			if (!prev || totalStatGain > prev.totalStatGain){
				grindRoutes = grindRoutes.filter(e => e.statName !== stat);
				grindRoutes.push(new GrindRoute(stat, totalStatGain || 0));
			} else {
				prev.projectedGain = GrindRoute.calculateProjectedGain(prev.statName, prev.totalStatGain);
			}
		}
	}

	static migrate(ar:PropertiesOf<GrindRoute | any>[]) {
		if (!ar) return ar;
		return ar;
	}

	static fromJSON(ar:PropertiesOf<GrindRoute>[]) {
		ar = this.migrate(ar);
		return ar.map(r => new GrindRoute(r)).filter(r => getStat(r.statName).learnable);
	}

	static deleteRoute(stat: string){
		const index = grindRoutes.findIndex(r => r.statName === stat);
		grindRoutes.splice(index, 1);
	}

	static loadBestRoute(){
		if (!grindRoutes.length) return;
		let ordered = grindRoutes
			.filter(r => r.projectedGain > settings.minStatGain && !r.failed)
			.sort((a, b) => b.projectedGain - a.projectedGain);
		if (ordered.some(r => !r.tried)){
			ordered = ordered.filter(r => r.tried);
		}
		if (ordered && ordered.length){
			ordered[0].tried = true;
			ordered[0].loadRoute();
		}
	}

	static checkStatValue(){
		grindRoutes.forEach(r => r.tried = false);
	}

	static stopCheckingStatValue(){
		grindRoutes.forEach(r => r.tried = true);
	}
}

let grindRoutes: GrindRoute[] = [];
