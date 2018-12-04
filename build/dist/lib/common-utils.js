'use strict';
var _a = require('./constants/test-statuses'), SUCCESS = _a.SUCCESS, FAIL = _a.FAIL, ERROR = _a.ERROR, SKIPPED = _a.SKIPPED, UPDATED = _a.UPDATED, IDLE = _a.IDLE;
exports.isSuccessStatus = function (status) { return status === SUCCESS; };
exports.isFailStatus = function (status) { return status === FAIL; };
exports.isIdleStatus = function (status) { return status === IDLE; };
exports.isErroredStatus = function (status) { return status === ERROR; };
exports.isSkippedStatus = function (status) { return status === SKIPPED; };
exports.isUpdatedStatus = function (status) { return status === UPDATED; };
//# sourceMappingURL=common-utils.js.map