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

async function waitForPause(){
	return new Promise(resolve => {
		gameStatus = new Proxy(gameStatus, {
			set: (target: any, prop: string, value: boolean) => {
				if (prop == "paused" && value){
					settings.running = false;
					resolve(true);
				}
				return true;
			},
		});
	});
}
