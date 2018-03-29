'use strict';

const {isArray, find, get, values} = require('lodash');
const {isSuccessStatus, isFailStatus, isErroredStatus, isSkippedStatus, isUpdatedStatus} = require('../../common-utils');

function hasFails(node) {
    const {result} = node;
    const isFailed = result && (isErroredStatus(result.status) || isFailStatus(result.status));

    return isFailed || walk(node, hasFails);
}

function isSuiteFailed(suite) {
    return isFailStatus(suite.status) || isErroredStatus(suite.status);
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

function allUpdated(node) {
    const {result} = node;
    const isUpdated = result && isUpdatedStatus(result.status);

    return Boolean(isUpdated || walk(node, allUpdated, Array.prototype.every));
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

function setStatusForBranch(nodes, suitePath, status) {
    const node = findNode(nodes, suitePath);
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
    hasFails,
    isSuiteFailed,
    hasRetries,
    allSkipped,
    allUpdated,
    findNode,
    setStatusToAll,
    setStatusForBranch
};
