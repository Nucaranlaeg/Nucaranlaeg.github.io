"use strict";
function assertEqual(expected, actual) {
    if (expected === actual)
        return;
    if (expected?.toString() === actual?.toString())
        return;
    let trace;
    try {
        throw new Error("Assertion Failure");
    }
    catch (e) {
        trace = e;
    }
    errors.push({
        expected,
        actual,
        trace,
    });
}
async function waitForPause() {
    return new Promise(resolve => {
        gameStatus = new Proxy(gameStatus, {
            set: (target, prop, value) => {
                if (prop == "paused" && value) {
                    settings.running = false;
                    resolve(true);
                }
                return true;
            },
        });
    });
}
//# sourceMappingURL=test_util.js.map