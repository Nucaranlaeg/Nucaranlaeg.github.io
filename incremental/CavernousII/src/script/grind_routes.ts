class GrindRoute {
	statName!: anyStatName;
	totalStatGain!: number;
	totalTime!: number;
	projectedGain!: number;
	realm!: number;
	route!: any[];

	constructor(x: anyStatName, totalStatGain:number)
	constructor(x: PropertiesOf<GrindRoute>)
	constructor(x: anyStatName | PropertiesOf<GrindRoute>, totalStatGain:number = 0) {
		if (typeof x !== 'string') {
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
		this.route = zones.map(z => z.node ? z.queues.map(queue => queueToString(queue)) : "").filter(q => q);
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

	static calculateProjectedGain(pStatName:anyStatName, pTotalStatGain:number) {
		let scalingStart = 99 + getRealmMult('Compounding Realm');
		let stat = getStat(pStatName);
		let val = (stat.base + pTotalStatGain + 1) ** (0.9 * (stat.base > scalingStart ? scalingStart / stat.base : 1) ** 0.05) - (stat.base + 1);
		let prevVal = (stat.base + 1) ** (0.9 * (stat.base > scalingStart ? scalingStart / stat.base : 1) ** 0.05) - (stat.base + 1);
		return val < 0 ? 0 : (val - (prevVal < 0 ? 0 : prevVal)) / stat.statIncreaseDivisor * (0.99 + getRealmMult("Compounding Realm") / 100);
	}

	static getBestRoute(stat:anyStatName) {
		return grindRoutes.find(r => r.statName == stat);
	}

	static updateBestRoute(stat: anyStatName, totalStatGain: number) {
		if (!getStat(stat).learnable || !totalStatGain) return;
		let prev = GrindRoute.getBestRoute(stat);
		if (settings.statGrindPerSec){
			// Replace stat grind routes if they're better in gain per second
			if (!prev || totalStatGain / queueTime > prev.totalStatGain / prev.totalTime){
				grindRoutes = grindRoutes.filter(e => e.statName != stat);
				grindRoutes.push(new GrindRoute(stat, totalStatGain || 0));
			} else {
				prev.projectedGain = GrindRoute.calculateProjectedGain(prev.statName, prev.totalStatGain);
			}
		} else {
			// Replace stat grind routes if they're better absolute value-wise
			if (!prev || totalStatGain > prev.totalStatGain){
				grindRoutes = grindRoutes.filter(e => e.statName != stat);
				grindRoutes.push(new GrindRoute(stat, totalStatGain || 0));
			} else {
				prev.projectedGain = GrindRoute.calculateProjectedGain(prev.statName, prev.totalStatGain);
			}
		}
	}

	static migrate(ar:PropertiesOf<GrindRoute | any>[]) {
		if (!ar) return ar;
		ar = ar.filter(r => !r.zone);
		return ar;
	}

	static fromJSON(ar:PropertiesOf<GrindRoute>[]) {
		ar = this.migrate(ar);
		return ar.map(r => new GrindRoute(r)).filter(r => getStat(r.statName).learnable);
	}

	static deleteRoute(stat: string){
		let index = grindRoutes.findIndex(r => r.statName == stat);
		grindRoutes.splice(index, 1);
	}

	static loadBestRoute(){
		if (!grindRoutes.length) return;
		let bestRoute = grindRoutes
		.filter(r => r.projectedGain > settings.minStatGain && getStat(r.statName).learnable)
			.sort((a, b) => b.projectedGain - a.projectedGain)[0];
		if (bestRoute){
			bestRoute.loadRoute();
		}
	}
}

let grindRoutes: GrindRoute[] = [];
