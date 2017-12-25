'use strict';

import {some} from 'lodash';

export function hasFails(node) {
    const isFailed = node.result && (node.result.error || node.result.fail);
    return isFailed || walk(node, hasFails);
}

export function hasRetries(node) {
    const isRetried = node.retries && node.retries.length;
    return isRetried || walk(node, hasRetries);
}

function walk(node, cb) {
    return some(node.browsers, cb) || some(node.children, cb);
}
