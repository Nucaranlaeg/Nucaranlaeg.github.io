let runTests: number = URLParams.get("test") === null ? -1 : +URLParams.get("test")!;
let testLoad: () => void;
if (runTests > -1) {
	testLoad = load;
	// Disable loading normally
	// @ts-ignore
	load = () => {};
}

enum TestResult {
	Success = 0,
	Errored = 1,
	Failure = 2,
};

function nextTest(){
	const url = new URL(document.location.href);
	url.searchParams.set("test", runTests.toString());
	url.searchParams.set("saving", "disabled");
	document.location.assign(url);
}

function revealWholeMap(zone:number){
	for (let i = 0 - zones[zone].yOffset; i < zones[zone].map.length - zones[zone].yOffset; i++){
		for (let j = 0 - zones[zone].xOffset; j < zones[zone].map[0].length - zones[zone].xOffset; j++){
			zones[zone].getMapLocation(j, i, true);
		}
	}
	drawMap();
}

let errors: {
	expected?: any;
	actual?: any;
	trace?: any;
}[] = [];

const tests: {
	name: string;
	reloadBefore?: boolean;
	test: () => any;
}[] = [
	/************************************************ Queues *********************************************/
	{
		name: "HasFutureSync",
		test: () => {
			const queue = new ActionQueue(0);
			queue.addAction("L");
			queue.addAction("R");
			queue.addAction("U");
			assertEqual(false, queue.hasFutureSync());
			queue.forEach(a => a.done = ActionStatus.Complete);
			assertEqual(false, queue.hasFutureSync());
			queue.forEach(a => a.reset());
			queue.addAction("=");
			assertEqual(true, queue.hasFutureSync());
			queue[0].done = ActionStatus.Complete;
			queue[1].done = ActionStatus.Complete;
			assertEqual(true, queue.hasFutureSync());
			queue.forEach(a => a.done = ActionStatus.Complete);
			queue.addAction("D");
			assertEqual(false, queue.hasFutureSync());
		},
	},
	{
		name: "GetCorrectNextAction",
		test: () => {
			const queue = new ActionQueue(0);
			clones = [new Clone(0)];
			queue.addAction("L");
			queue.addAction("R");
			queue.addAction("U");
			assertEqual("L", queue.getNextAction());
			queue.forEach(a => a.done = ActionStatus.Complete);
			assertEqual(null, queue.getNextAction());
			queue.addAction("I");
			assertEqual("I", queue.getNextAction());
			queue.cursor = 2;
			queue.addAction("D");
			assertEqual("I", queue.getNextAction());
		},
	},
	{
		name: "LoadsFromString",
		test: () => {
			const queue = new ActionQueue(0);
			queue.fromString("UDLRIP1:-2;P-3:0;N4;<=.,:T");
			assertEqual("UDLRIP1:-2;P-3:0;N4;<=.,:T", queue.toString());
			assertEqual(14, queue.length);
		},
	},
	/************************************************ Stuff *********************************************/
	{
		name: "EffectsAreProperlyCalculated",
		test: () => {
			let gem = getStuff("Gem"), pick = getStuff("Iron Pick");
			let magic = getStat("Magic"), mining = getStat("Mining");
			gem.update(1.5);
			magic.current = 0;
			assertEqual(2.5, magic.bonus);
			assertEqual(100/102.5, magic.value);
			magic.current = 200;
			magic.updateValue();
			assertEqual(100/305, magic.value);
			gem.update(1.5);
			assertEqual(7.5, magic.bonus);
			assertEqual(100/315, magic.value);
		},
	},
	{
		name: "HealthEtcAreProperlyCalculated",
		test: () => {
			let ironSword = getStuff("Iron Sword"), steelSword = getStuff("Steel Sword"), plus1Sword = getStuff("+1 Sword");
			let ironShield = getStuff("Iron Shield"), steelShield = getStuff("Steel Shield"), plus1Shield = getStuff("+1 Shield");
			let ironArmour = getStuff("Iron Armour"), steelArmour = getStuff("Steel Armour"), plus1Armour = getStuff("+1 Armour");
			let health = getStat("Health"), attack = getStat("Attack"), defense = getStat("Defense");
			clones = Array(5).fill(0).map((x, i) => new Clone(i));
			ironSword.update(1);
			assertEqual(1, attack.current);
			steelSword.update(2);
			assertEqual(5, attack.current);
			plus1Sword.update(3);
			assertEqual(16, attack.current);
			ironShield.update(1);
			assertEqual(1, defense.current);
			steelShield.update(2);
			assertEqual(5, defense.current);
			plus1Shield.update(3);
			assertEqual(16, defense.current);
			ironArmour.update(1);
			assertEqual(15, health.current);
			steelArmour.update(2);
			assertEqual(45, health.current);
			plus1Armour.update(3);
			assertEqual(115, health.current);
		},
	},
	/************************************************ Integration *********************************************/
	{
		name: "ManyActionsAreNotSkipped",
		reloadBefore: true,
		test: async () => {
			clones = Array(10).fill(0).map((x, i) => new Clone(i));
			zones[0].queues.forEach((q, i) => i == 0 ? q.fromString("RRRRRT") : q.fromString("RRRRRIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIIII"));
			getStat("Magic").base = 1000;
			getStat("Mining").base = 1000;
			getStat("Speed").base = 500;
			resetLoop();
			settings.autoRestart = AutoRestart.WaitAll;
			settings.running = true;
			settings.usingBankedTime = true;
			timeBanked = Infinity;
			getStuff("Gold Nugget").count = 100;
			await waitForPause();
			zones[0].queues.forEach(q => {
				assertEqual(null, q.getNextAction());
			});
			assertEqual(0, getStuff("Gold Nugget").count);
		},
	},
	{
		name: "SyncsHaveNoLatency",
		reloadBefore: true,
		test: async () => {
			clones = Array(3).fill(0).map((x, i) => new Clone(i));
			zones[0].queues[0].fromString("R=RR=R");
			zones[0].queues[1].fromString("+RR+RR=");
			zones[0].queues[2].fromString("R==R");
			resetLoop();
			settings.autoRestart = AutoRestart.WaitAll;
			settings.running = true;
			settings.usingBankedTime = true;
			timeBanked = Infinity;
			await waitForPause();
			zones[0].queues.forEach(q => {
				assertEqual(null, q.getNextAction());
			});
		},
	},
	{
		name: "ProperKudzus",
		reloadBefore: true,
		test: async () => {
			clones = Array(5).fill(0).map((x, i) => new Clone(i));
			zones[0].queues.forEach(q => q.fromString("RRRRRDDDD"));
			resetLoop();
			getStat("Mana").current = 3;
			settings.autoRestart = AutoRestart.WaitAll;
			settings.running = true;
			settings.usingBankedTime = true;
			timeBanked = Infinity;
			await waitForPause();
			zones[0].queues.forEach(q => {
				assertEqual(null, q.getNextAction());
			});
		},
	},
	{
		name: "WitherWorksOnOldKudzus",
		reloadBefore: true,
		test: async () => {
			clones = Array(5).fill(0).map((x, i) => new Clone(i));
			zones[0].queues.forEach(q => q.fromString("RRRRRDDN1;IDN1;I"));
			resetLoop();
			getStat("Mana").current = 10;
			getStuff("Gold Nugget").count = 2;
			getStuff("Iron Ore").count = 2;
			getStuff("Salt").count = 2;
			settings.autoRestart = AutoRestart.WaitAll;
			settings.running = true;
			settings.usingBankedTime = true;
			timeBanked = Infinity;
			await waitForPause();
			zones[0].queues.forEach(q => {
				assertEqual(null, q.getNextAction());
			});
		},
	},
	{
		name: "IronBridgesWorkProperlyOnLava",
		reloadBefore: true,
		test: async () => {
			clones = Array(2).fill(0).map((x, i) => new Clone(i));
			zones[0].queues.forEach(q => q.fromString("RRR"));
			resetLoop();
			setMined(2, 0, "~");
			getStat("Mana").current = 10;
			getStuff("Iron Bridge").count = 2;
			settings.autoRestart = AutoRestart.WaitAll;
			settings.running = true;
			settings.usingBankedTime = true;
			timeBanked = Infinity;
			await waitForPause();
			zones[0].queues.forEach(q => {
				assertEqual(null, q.getNextAction());
			});
			clones.forEach(c => {
				assertEqual(3, c.x);
			});
		},
	},
	{
		name: "CanPathfind",
		reloadBefore: true,
		test: async () => {
			clones = [new Clone(0)];
			zones[0].queues[0].fromString("P6:7;");
			resetLoop();
			revealWholeMap(0);
			setMined(1, 0, "▣"); zones[0].getMapLocation(1, 0)!.entered = 1;
			setMined(2, 0, "."); zones[0].getMapLocation(2, 0)!.entered = 1;
			setMined(3, 0, "♥"); zones[0].getMapLocation(3, 0)!.entered = 1;
			setMined(3, -1, "╬"); zones[0].getMapLocation(3, -1)!.entered = 1;
			setMined(3, -2, "*"); zones[0].getMapLocation(3, -2)!.entered = 1;
			setMined(3, -3, "="); zones[0].getMapLocation(3, -3)!.entered = 1;
			setMined(2, -3, "⎶"); zones[0].getMapLocation(2, -3)!.entered = 1;
			setMined(1, -3, "&"); zones[0].getMapLocation(1, -3)!.entered = 1;
			setMined(1, -4, "║"); zones[0].getMapLocation(1, -4)!.entered = 1;
			setMined(0, -4, '"'); zones[0].getMapLocation(0, -4)!.entered = 1;
			setMined(-1, -4, "("); zones[0].getMapLocation(-1, -4)!.entered = 1;
			setMined(-1, -3, ")"); zones[0].getMapLocation(-1, -3)!.entered = 1;
			setMined(-1, -2, "["); zones[0].getMapLocation(-1, -2)!.entered = 1;
			setMined(-2, -2, "]"); zones[0].getMapLocation(-2, -2)!.entered = 1;
			setMined(-3, -2, "{"); zones[0].getMapLocation(-3, -2)!.entered = 1;
			setMined(-3, -1, "}"); zones[0].getMapLocation(-3, -1)!.entered = 1;
			setMined(-3, 0, "^"); zones[0].getMapLocation(-3, 0)!.entered = 1;
			setMined(-3, 1, "W"); zones[0].getMapLocation(-3, 1)!.entered = 1;
			setMined(-3, 2, "H"); zones[0].getMapLocation(-3, 2)!.entered = 1;
			setMined(-2, 2, "T"); zones[0].getMapLocation(-2, 2)!.entered = 1;
			setMined(-1, 2, "t"); zones[0].getMapLocation(-1, 2)!.entered = 1;
			setMined(-1, 3, "F"); zones[0].getMapLocation(-1, 3)!.entered = 1;
			setMined(-1, 4, "D"); zones[0].getMapLocation(-1, 4)!.entered = 1;
			setMined(-1, 5, "d"); zones[0].getMapLocation(-1, 5)!.entered = 1;
			setMined(-1, 6, "P"); zones[0].getMapLocation(-1, 6)!.entered = 1;
			setMined(0, 6, "¢"); zones[0].getMapLocation(0, 6)!.entered = 1;
			setMined(1, 6, "¥"); zones[0].getMapLocation(1, 6)!.entered = 1;
			setMined(2, 6, "£"); zones[0].getMapLocation(2, 6)!.entered = 1;
			setMined(3, 6, "©"); zones[0].getMapLocation(3, 6)!.entered = 1;
			setMined(3, 7, "Θ"); zones[0].getMapLocation(3, 7)!.entered = 1;
			setMined(4, 7, "|"); zones[0].getMapLocation(4, 7)!.entered = 1;
			setMined(5, 7, "<"); zones[0].getMapLocation(5, 7)!.entered = 1;
			setMined(6, 7, ">"); zones[0].getMapLocation(6, 7)!.entered = 1;
			drawMap();
			settings.autoRestart = AutoRestart.WaitAll;
			settings.running = true;
			settings.usingBankedTime = true;
			timeBanked = Infinity;

			await waitForPause();
			assertEqual(null, zones[0].queues[0].getNextAction());
			assertEqual(6, clones[0].x);
			assertEqual(7, clones[0].y);
		},
	},
];

function decycle(obj: any, stack: any = []): any {
	if (!obj || typeof obj !== 'object') return obj;
	if (stack.includes(obj)) return null;
	if (stack.length >= 4) return null;
	let s = stack.concat([obj]);
	return Array.isArray(obj) ? obj.map(x => decycle(x, s)) : Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, decycle(v, s)]));
}

setTimeout(async () => {
	if (runTests == -1) return;
	suppressMessages = true;
	let testResults;
	if (runTests == 0 || URLParams.get("only") === "true"){
		testResults = [];
		localStorage["testResults"] = undefined;
	} else {
		// @ts-ignore
		testResults = JSON.parse(LZString.decompressFromBase64(localStorage["testResults"])!);
	}
	do {
		console.log(`Running test ${runTests+1} of ${tests.length}`);
		errors = [];
		if (tests[runTests]){
			try {
				await tests[runTests].test();
				if (!errors.length){
					testResults.push({
						name: tests[runTests].name,
						result: TestResult.Success,
					});
				} else {
					testResults.push({
						name: tests[runTests].name,
						result: TestResult.Failure,
						assertions: errors,
					});
				}
			} catch (e: any) {
				testResults.push({
					name: tests[runTests].name,
					result: TestResult.Errored,
					error: e,
				});
			}
		}
		runTests++;
	} while (tests[runTests] && !tests[runTests].reloadBefore);
	// @ts-ignore
	localStorage["testResults"] = LZString.compressToBase64(JSON.stringify(decycle(testResults)));
	if (tests[runTests] && URLParams.get("only") !== "true"){
		nextTest();
	} else {
		const counts = [0,0,0];
		testResults.forEach((c: {result: TestResult}) => counts[c.result] += 1);
		console.log("Tests complete!");
		console.log(`Successful: ${counts[TestResult.Success]}
Failed: ${counts[TestResult.Failure]}
Errored: ${counts[TestResult.Errored]}
Total: ${tests.length}`);
		console.log("Failures:");
		testResults.forEach((result: any) => {
			if (result.result != TestResult.Failure) return;
			console.log(result.name, result.assertions);
		});
		console.log("Errors:");
		testResults.forEach((result: any) => {
			if (result.result != TestResult.Errored) return;
			console.log(result.name, result.error);
		});
	}
}, 0);
