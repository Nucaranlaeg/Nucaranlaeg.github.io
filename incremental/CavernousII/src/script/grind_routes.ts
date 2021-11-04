class GrindRoute extends BaseRoute {
	statName!: anyStatName;
	totalStatGain!: number;
	totalTime!: number;
	projectedGain!: number;
	zone!: number;
	realm!: number;
	route!: any[];
	require!: simpleStuffList;
	cloneHealth!: number[];
	clonesLost!: number;

	constructor(x: anyStatName, totalStatGain:number)
	constructor(x: PropertiesOf<GrindRoute>)
	constructor(x: anyStatName | PropertiesOf<GrindRoute>, totalStatGain:number = 0) {
		super();
		if (typeof x !== 'string') {
			Object.assign(this, x);
			return;
		}
		this.statName = x;
		this.totalStatGain = totalStatGain;
		this.totalTime = queueTime;
		this.projectedGain = GrindRoute.calculateProjectedGain(this.statName, this.totalStatGain);

		this.zone = currentZone;
		this.realm = currentRealm;
		let route = queues.map((r, i) => queueToString(r));
		route = route.filter(e => e.length);

		if (route.every((e, i, a) => e == a[0])) {
			route = [route[0]];
		} else {
			let unique = route.find((e, i, a) => a.filter(el => el == e).length == 1);
			let ununique = route.find(e => e != unique);
			if (route.every(e => e == unique || e == ununique) && unique && ununique) {
				route = [unique, ununique];
			}
		}
		this.route = route;
		// cloneHealth is [min (from start), delta]
		this.cloneHealth = clones.map(c => c.minHealth);

		this.require = zones[currentZone].startStuff
			.map(s => {
				return {
					name: s.name,
					count: s.count - getStuff(s.name).min
				};
			})
			.filter(s => s.count > 0);
	}

	loadRoute(){
		if (this.realm !== currentRealm) changeRealms(this.realm);
		return super.loadRoute();
	}

	static calculateProjectedGain(pStatName:anyStatName, pTotalStatGain:number) {
		let scalingStart = 99 + getRealmMult('Compounding Realm');
		let stat = getStat(pStatName);
		let val = (stat.base + pTotalStatGain + 1) ** (0.9 * (stat.base > scalingStart ? scalingStart / stat.base : 1) ** 0.05) - (stat.base + 1);
		let prevVal = (stat.base + 1) ** (0.9 * (stat.base > scalingStart ? scalingStart / stat.base : 1) ** 0.05) - (stat.base + 1);
		return val < 0 ? 0 : (val - (prevVal < 0 ? 0 : prevVal)) / stat.statIncreaseDivisor;
	}

	static getBestRoute(stat:anyStatName) {
		return grindRoutes.find(r => r.statName == stat);
	}

	static updateBestRoute(stat: anyStatName, totalStatGain: number) {
		if (stat == 'Mana' || !totalStatGain) return;
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

	static migrate(ar:PropertiesOf<GrindRoute>[]) {
		if (!ar) return ar;
		ar.forEach((route: any) => {
			if (route.requirements){
				route.require = route.requirements;
				route.requirements = undefined;
			}
		});
		return ar;
	}

	static fromJSON(ar:PropertiesOf<GrindRoute>[]) {
		ar = this.migrate(ar);
		return ar.map(r => new GrindRoute(r));
	}

	static deleteRoute(stat: string){
		let index = grindRoutes.findIndex(r => r.statName == stat);
		grindRoutes.splice(index, 1);
	}

	static loadBestRoute(){
		if (!grindRoutes.length) return;
		let bestRoute = grindRoutes
			.filter(r => r.projectedGain)
			.sort((a, b) => b.projectedGain - a.projectedGain)[0];
		if (bestRoute){
			bestRoute.loadRoute();
		}
	}
}

let grindRoutes: GrindRoute[] = [];
