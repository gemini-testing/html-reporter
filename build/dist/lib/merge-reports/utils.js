'use strict';
var _ = require('lodash');
var _a = require('../constants/test-statuses'), SUCCESS = _a.SUCCESS, FAIL = _a.FAIL, ERROR = _a.ERROR, SKIPPED = _a.SKIPPED;
function getDataFrom(node, _a) {
    var fieldName = _a.fieldName, fromFields = _a.fromFields;
    if (!fromFields) {
        return [].concat(_.get(node, fieldName, []));
    }
    var _b = _.pick(node, fromFields), _c = _b.result, result = _c === void 0 ? {} : _c, _d = _b.retries, retries = _d === void 0 ? {} : _d;
    return _.isEmpty(result) && _.isEmpty(retries)
        ? walk(node, function (n) { return getDataFrom(n, { fieldName: fieldName, fromFields: fromFields }); }, _.flatMap)
        : [].concat(_.get(result, fieldName, []), _.flatMap(retries, fieldName));
}
function getImagePaths(node, fromFields) {
    return _(getDataFrom(node, { fieldName: 'imagesInfo', fromFields: fromFields }))
        .map(function (imageInfo) { return _.pick(imageInfo, ['expectedPath', 'actualPath', 'diffPath']); })
        .reject(_.isEmpty)
        .flatMap(_.values)
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