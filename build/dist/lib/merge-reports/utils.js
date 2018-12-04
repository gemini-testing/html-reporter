"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var lodash_1 = tslib_1.__importDefault(require("lodash"));
var _a = require('../constants/test-statuses'), SUCCESS = _a.SUCCESS, FAIL = _a.FAIL, ERROR = _a.ERROR, SKIPPED = _a.SKIPPED;
function getDataFrom(node, _a) {
    var _b = _a.fieldName, fieldName = _b === void 0 ? '' : _b, fromFields = _a.fromFields;
    if (!fromFields) {
        return [].concat(lodash_1.default.get(node, fieldName, []));
    }
    var _c = lodash_1.default.pick(node, fromFields), _d = _c.result, result = _d === void 0 ? {} : _d, _e = _c.retries, retries = _e === void 0 ? {} : _e;
    return lodash_1.default.isEmpty(result) && lodash_1.default.isEmpty(retries)
        ? walk(node, function (n) { return getDataFrom(n, { fieldName: fieldName, fromFields: fromFields }); }, lodash_1.default.flatMap)
        : (new Array()).concat(lodash_1.default.get(result, fieldName, []), lodash_1.default.flatMap(retries, fieldName));
}
function getImagePaths(node, fromFields) {
    return lodash_1.default(getDataFrom(node, { fieldName: 'imagesInfo', fromFields: fromFields }))
        .map(function (imageInfo) { return lodash_1.default.pick(imageInfo, ['expectedPath', 'actualPath', 'diffPath']); })
        .reject(lodash_1.default.isEmpty)
        .flatMap(lodash_1.default.values)
        .value();
}
function getStatNameForStatus(status) {
    var _a;
    var statusToStat = (_a = {},
        _a[SUCCESS] = 'passed',
        _a[FAIL] = 'failed',
        _a[ERROR] = 'failed',
        _a[SKIPPED] = 'skipped',
        _a);
    return statusToStat[status];
}
function walk(node, cb, fn) {
    return node.browsers && fn(node.browsers, cb) || node.children && fn(node.children, cb) || [];
}
module.exports = {
    getDataFrom: getDataFrom,
    getImagePaths: getImagePaths,
    getStatNameForStatus: getStatNameForStatus
};
//# sourceMappingURL=utils.js.map