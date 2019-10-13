'use strict';

module.exports = [
    'suitePath',
    'suiteName',
    'name',
    'suiteUrl',
    'metaInfo',
    'description',
    'error',
    'skipReason',
    'imagesInfo',
    'screenshot',
    'multipleTabs',
    'status',
    'timestamp'
].reduce((acc, current, index) => {
    acc[current] = index;
    return acc;
}, {});
