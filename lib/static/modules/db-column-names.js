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
    'timestamp' // timestamp corresponds to attempt number -- every next test retry will have bigger timestamp (just like every next test retry having bigger attempt number)
].reduce((acc, current, index) => {
    acc[current] = index;
    return acc;
}, {});
