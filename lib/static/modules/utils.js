'use strict';

const {isArray, find, get, values} = require('lodash');
const {isFailStatus, isErroredStatus, isSkippedStatus, determineStatus} = require('../../common-utils');
const {getCommonErrors} = require('../../constants/errors');

const {NO_REF_IMAGE_ERROR} = getCommonErrors();

function hasFailedImages(result) {
    const {imagesInfo = [], status} = result;

    return imagesInfo.some(({status}) => isErroredStatus(status) || isFailStatus(status))
        || isErroredStatus(status) || isFailStatus(status);
}

function hasNoRefImageErrors({imagesInfo = []}) {
    return Boolean(imagesInfo.filter((v) => get(v, 'error.stack', '').startsWith(NO_REF_IMAGE_ERROR)).length);
}

function hasFails(node) {
    const {result} = node;
    const isFailed = result && hasFailedImages(result);

    return isFailed || walk(node, hasFails);
}

function isSuiteFailed(suite) {
    return isFailStatus(suite.status) || isErroredStatus(suite.status);
}

function isAcceptable({status, error}) {
    const stack = get(error, 'stack', '');

    return isErroredStatus(status) && stack.startsWith(NO_REF_IMAGE_ERROR) || isFailStatus(status);
}

function hasRetries(node) {
    const isRetried = node.retries && node.retries.length;
    return isRetried || walk(node, hasRetries);
}

function allSkipped(node) {
    const {result} = node;
    const isSkipped = result && isSkippedStatus(result.status);

    return Boolean(isSkipped || walk(node, allSkipped, Array.prototype.every));
}

function walk(node, cb, fn = Array.prototype.some) {
    return node.browsers && fn.call(node.browsers, cb) || node.children && fn.call(node.children, cb);
}

function setStatusToAll(node, status) {
    if (isArray(node)) {
        node.forEach((n) => setStatusToAll(n, status));
    }

    const currentStatus = get(node, 'result.status', node.status);
    if (isSkippedStatus(currentStatus)) {
        return;
    }
    node.result
        ? (node.result.status = status)
        : node.status = status;

    return walk(node, (n) => setStatusToAll(n, status), Array.prototype.forEach);
}

function findNode(node, suitePath) {
    suitePath = suitePath.slice();
    if (!node.children) {
        node = values(node);
        const tree = {
            name: 'root',
            children: node
        };
        return findNode(tree, suitePath);
    }

    const pathPart = suitePath.shift();
    const child = find(node.children, {name: pathPart});

    if (!child) {
        return;
    }

    if (child.name === pathPart && !suitePath.length) {
        return child;
    }

    return findNode(child, suitePath);
}

function setStatusForBranch(nodes, suitePath) {
    const node = findNode(nodes, suitePath);
    if (!node) {
        return;
    }

    const statuses = node.browsers
        ? node.browsers.map(({result: {status}}) => status)
        : node.children.map(({status}) => status);

    const status = determineStatus(statuses);

    // if newly determined status is the same as current status, do nothing
    if (node.status === status) {
        return;
    }

    node.status = status;
    setStatusForBranch(nodes, suitePath.slice(0, -1));
}

function shouldSuiteBeShown(suite, filterByName) {
    const suiteFullPath = suite.suitePath.join(' ');

    if (suiteFullPath.includes(filterByName)) {
        return true;
    }
    if (suite.hasOwnProperty('children')) {
        return suite.children.some(child => shouldSuiteBeShown(child, filterByName));
    }

    return false;
}

module.exports = {
    hasNoRefImageErrors,
    hasFails,
    isSuiteFailed,
    isAcceptable,
    hasRetries,
    allSkipped,
    findNode,
    setStatusToAll,
    setStatusForBranch,
    shouldSuiteBeShown
};
