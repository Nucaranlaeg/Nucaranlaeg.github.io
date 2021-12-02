let runTests: number = URLParams.get("test") === null ? -1 : +URLParams.get("test")!;

enum TestResult {
	Success = 0,
	Errored = 1,
	Failure = 2,
};

function nextTest(){
	const url = new URL(document.location.href);
	url.searchParams.set("test", (runTests + 1).toString());
	url.searchParams.set("saving", "disabled");
	document.location.assign(url);
}

let errors: {
	expected?: any;
	actual?: any;
	trace?: any;
}[] = [];

function assertEqual(expected: any, actual: any){
	if (expected === actual) return;
	if (expected?.toString() === actual?.toString()) return;
	let trace;
	try {
		throw new Error("Assertion Failure");
	} catch (e) {
		trace = e;
	}
	errors.push({
		expected,
		actual,
		trace,
	});
}

const tests: {
	name: string;
	needReload?: boolean;
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
];

setTimeout(() => {
	let testResults;
	if (runTests == 0){
		testResults = [];
		localStorage["testResults"] = undefined;
	} else {
		testResults = JSON.parse(LZString.decompressFromBase64(localStorage[saveName])!);
	}
	do {
		console.log(`Running test ${runTests} of ${tests.length}`);
		errors = [];
		if (tests[runTests]){
			try {
				tests[runTests].test();
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
	} while (tests[runTests] && !tests[runTests].needReload);
	localStorage["testResults"] = LZString.compressToBase64(JSON.stringify(testResults));
	if (tests[runTests]){
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
});
