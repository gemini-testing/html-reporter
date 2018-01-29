'use strict';

const {isArray, find} = require('lodash');
const testStatuses = require('../../constants/test-statuses');

function hasFails(node) {
    const isFailed = node.result && (node.result.error || node.result.fail);
    return isFailed || walk(node, hasFails);
}

function hasRetries(node) {
    const isRetried = node.retries && node.retries.length;
    return isRetried || walk(node, hasRetries);
}

function allSkipped(node) {
    const isSkipped = node.result && node.result.skipped;
    return Boolean(isSkipped || walk(node, allSkipped, Array.prototype.every));
}

function walk(node, cb, fn = Array.prototype.some) {
    return node.browsers && fn.call(node.browsers, cb) || node.children && fn.call(node.children, cb);
}

function setStatusToAll(node, status) {
    if (isArray(node)) {
        node.forEach((n) => setStatusToAll(n, status));
    }

    node.result
        ? (node.result.status = status)
        : node.status = status;

    return walk(node, (n) => setStatusToAll(n, status), Array.prototype.forEach);
}

function findNode(node, suitePath) {
    suitePath = suitePath.slice();
    if (isArray(node)) {
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
    if (node) {
        if (status === testStatuses.SUCCESS && hasFails(node)) {
            return;
        }

        node.status = status;
        suitePath = suitePath.slice(0, -1);
        setStatusForBranch(nodes, suitePath, status);
    }
}

module.exports = {
    hasFails,
    hasRetries,
    allSkipped,
    findNode,
    setStatusToAll,
    setStatusForBranch
};
