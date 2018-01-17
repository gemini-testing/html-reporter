'use strict';

import {some, every} from 'lodash';

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
    return !!(isSkipped || walk(node, allSkipped, every));
}

function walk(node, cb, fn = some) {
    return node.browsers && fn(node.browsers, cb) || node.children && fn(node.children, cb);
}
