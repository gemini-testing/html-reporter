'use strict';

const _ = require('lodash');
const {findNode} = require('../../static/modules/utils');

exports.formatTests = (test, testHandler) => {
    if (test.children) {
        return _.flatMap(test.children, (child) => exports.formatTests(child, testHandler));
    }

    if (test.browserId) {
        test.browsers = _.filter(test.browsers, {name: test.browserId});
    }

    return _.flatMap(test.browsers, (browser) => testHandler(browser, test));
};

exports.findTestResult = (suites = [], test) => {
    const {name, suitePath, browserId} = test;
    const nodeResult = findNode(suites, suitePath);
    const browserResult = _.find(nodeResult.browsers, {name: browserId});

    return {name, suitePath, browserId, browserResult};
};
