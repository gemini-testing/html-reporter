'use strict';
var _a = require('lodash'), isArray = _a.isArray, find = _a.find, get = _a.get, values = _a.values;
var _b = require('../../common-utils'), isSuccessStatus = _b.isSuccessStatus, isFailStatus = _b.isFailStatus, isErroredStatus = _b.isErroredStatus, isSkippedStatus = _b.isSkippedStatus, isUpdatedStatus = _b.isUpdatedStatus;
var getCommonErrors = require('../../constants/errors').getCommonErrors;
var NO_REF_IMAGE_ERROR = getCommonErrors().NO_REF_IMAGE_ERROR;
function hasFailedImages(result) {
    var _a = result.imagesInfo, imagesInfo = _a === void 0 ? [] : _a, status = result.status;
    return imagesInfo.some(function (_a) {
        var status = _a.status;
        return isErroredStatus(status) || isFailStatus(status);
    })
        || isErroredStatus(status) || isFailStatus(status);
}
function hasNoRefImageErrors(_a) {
    var _b = _a.imagesInfo, imagesInfo = _b === void 0 ? [] : _b;
    return Boolean(imagesInfo.filter(function (v) { return get(v, 'reason.stack', '').startsWith(NO_REF_IMAGE_ERROR); }).length);
}
function hasFails(node) {
    var result = node.result;
    var isFailed = result && hasFailedImages(result);
    return isFailed || walk(node, hasFails);
}
function isSuiteFailed(suite) {
    return isFailStatus(suite.status) || isErroredStatus(suite.status);
}
function isAcceptable(_a) {
    var status = _a.status, _b = _a.reason, reason = _b === void 0 ? '' : _b;
    var stack = reason && reason.stack;
    return isErroredStatus(status) && stack.startsWith(NO_REF_IMAGE_ERROR) || isFailStatus(status);
}
function hasRetries(node) {
    var isRetried = node.retries && node.retries.length;
    return isRetried || walk(node, hasRetries);
}
function allSkipped(node) {
    var result = node.result;
    var isSkipped = result && isSkippedStatus(result.status);
    return Boolean(isSkipped || walk(node, allSkipped, Array.prototype.every));
}
function walk(node, cb, fn) {
    if (fn === void 0) { fn = Array.prototype.some; }
    return node.browsers && fn.call(node.browsers, cb) || node.children && fn.call(node.children, cb);
}
function setStatusToAll(node, status) {
    if (isArray(node)) {
        node.forEach(function (n) { return setStatusToAll(n, status); });
    }
    var currentStatus = get(node, 'result.status', node.status);
    if (isSkippedStatus(currentStatus)) {
        return;
    }
    node.result
        ? (node.result.status = status)
        : node.status = status;
    return walk(node, function (n) { return setStatusToAll(n, status); }, Array.prototype.forEach);
}
function findNode(node, suitePath) {
    suitePath = suitePath.slice();
    if (!node.children) {
        node = values(node);
        var tree = {
            name: 'root',
            children: node
        };
        return findNode(tree, suitePath);
    }
    var pathPart = suitePath.shift();
    var child = find(node.children, { name: pathPart });
    if (!child) {
        return;
    }
    if (child.name === pathPart && !suitePath.length) {
        return child;
    }
    return findNode(child, suitePath);
}
function setStatusForBranch(nodes, suitePath, status) {
    var node = findNode(nodes, suitePath);
    if (!node) {
        return;
    }
    if ((isSuccessStatus(status) || isUpdatedStatus(status)) && hasFails(node)) {
        return;
    }
    node.status = status;
    suitePath = suitePath.slice(0, -1);
    setStatusForBranch(nodes, suitePath, status);
}
module.exports = {
    hasNoRefImageErrors: hasNoRefImageErrors,
    hasFails: hasFails,
    isSuiteFailed: isSuiteFailed,
    isAcceptable: isAcceptable,
    hasRetries: hasRetries,
    allSkipped: allSkipped,
    findNode: findNode,
    setStatusToAll: setStatusToAll,
    setStatusForBranch: setStatusForBranch
};
//# sourceMappingURL=utils.js.map