'use strict';
var _ = require('lodash');
var findNode = require('../../static/modules/utils').findNode;
var formatTestHandler = function (browser, test) {
    var suitePath = test.suitePath, name = test.name;
    return {
        suite: { path: suitePath.slice(0, -1) },
        state: { name: name },
        browserId: browser.name
    };
};
exports.formatTests = function (test) {
    if (test.children) {
        return _.flatMap(test.children, function (child) { return exports.formatTests(child); });
    }
    if (test.browserId) {
        test.browsers = _.filter(test.browsers, { name: test.browserId });
    }
    return _.flatMap(test.browsers, function (browser) { return formatTestHandler(browser, test); });
};
exports.findTestResult = function (suites, test) {
    if (suites === void 0) { suites = []; }
    var name = test.name, suitePath = test.suitePath, browserId = test.browserId;
    var nodeResult = findNode(suites, suitePath);
    var browserResult = _.find(nodeResult.browsers, { name: browserId });
    return { name: name, suitePath: suitePath, browserId: browserId, browserResult: browserResult };
};
//# sourceMappingURL=utils.js.map