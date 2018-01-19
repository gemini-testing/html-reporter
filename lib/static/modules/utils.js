'use strict';

export function hasFails(node) {
    const isFailed = node.result && (node.result.error || node.result.fail);
    return isFailed || walk(node, hasFails);
}

export function hasRetries(node) {
    const isRetried = node.retries && node.retries.length;
    return isRetried || walk(node, hasRetries);
}

export function allSkipped(node) {
    const isSkipped = node.result && node.result.skipped;
    return Boolean(isSkipped || walk(node, allSkipped, Array.prototype.every));
}

function walk(node, cb, fn = Array.prototype.some) {
    return node.browsers && fn.call(node.browsers, cb) || node.children && fn.call(node.children, cb);
}
