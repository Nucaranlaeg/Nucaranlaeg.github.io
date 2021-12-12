"use strict";
var CanStartReturnCode;
(function (CanStartReturnCode) {
    CanStartReturnCode[CanStartReturnCode["Never"] = 0] = "Never";
    CanStartReturnCode[CanStartReturnCode["NotNow"] = 1] = "NotNow";
    CanStartReturnCode[CanStartReturnCode["Now"] = 2] = "Now";
})(CanStartReturnCode || (CanStartReturnCode = {}));
;
var ActionStatus;
(function (ActionStatus) {
    ActionStatus[ActionStatus["NotStarted"] = 0] = "NotStarted";
    ActionStatus[ActionStatus["Started"] = 1] = "Started";
    ActionStatus[ActionStatus["Waiting"] = 2] = "Waiting";
    ActionStatus[ActionStatus["Complete"] = 3] = "Complete";
})(ActionStatus || (ActionStatus = {}));
;
//# sourceMappingURL=util.js.map