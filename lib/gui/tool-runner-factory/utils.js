'use strict';

const _ = require('lodash');
const {findNode} = require('../../static/modules/utils');

const formatTestHandler = (browser, test) => {
    const {suitePath, name} = test;

    return {
        suite: {path: suitePath.slice(0, -1)},
        state: {name},
        browserId: browser.name
    };
};

exports.formatTests = (test) => {
    let resultFromBrowsers = [];
    let resultFromChildren = [];

    if (test.children) {
        resultFromChildren = _.flatMap(test.children, (child) => exports.formatTests(child));
    }

    if (test.browsers) {
        if (test.browserId) {
            test.browsers = _.filter(test.browsers, {name: test.browserId});
        }

        resultFromBrowsers = _.flatMap(test.browsers, (browser) => formatTestHandler(browser, test));
    }
    return [...resultFromBrowsers, ...resultFromChildren];
};

exports.findTestResult = (suites = [], test) => {
    const {name, suitePath, browserId} = test;
    const nodeResult = findNode(suites, suitePath);
    const browserResult = _.find(nodeResult.browsers, {name: browserId});

    return {name, suitePath, browserId, browserResult};
};
