'use strict';

const crypto = require('crypto');

exports.formatId = (hash, browserId) => `${hash}/${browserId}`;

exports.getShortMD5 = (str) => {
    return crypto.createHash('md5').update(str, 'ascii').digest('hex').substr(0, 7);
};

exports.mkFullTitle = ({suite, state}) => {
    // https://github.com/mochajs/mocha/blob/v2.4.5/lib/runnable.js#L165
    return `${suite.path.join(' ')} ${state.name}`;
};
