'use strict';

const _ = require('lodash');

exports.formatTests = (test, testHandler) => {
    if (test.children) {
        return _.flatMap(test.children, (child) => exports.formatTests(child, testHandler));
    }

    if (test.browserId) {
        test.browsers = _.filter(test.browsers, {name: test.browserId});
    }

    return _.flatMap(test.browsers, (browser) => testHandler(browser, test));
};
