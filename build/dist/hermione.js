"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var bluebird_1 = tslib_1.__importDefault(require("bluebird"));
var PluginAdapter = require('./lib/plugin-adapter');
var reporter_helpers_1 = require("./lib/reporter-helpers");
module.exports = function (hermione, opts) {
    var plugin = PluginAdapter.create(hermione, opts, 'hermione');
    if (!plugin.isEnabled())
        return;
    plugin
        .addCliCommands()
        .init(prepareData, prepareImages);
};
function prepareData(hermione, reportBuilder) {
    var _a = hermione.events, TEST_PENDING = _a.TEST_PENDING, TEST_PASS = _a.TEST_PASS, TEST_FAIL = _a.TEST_FAIL, RETRY = _a.RETRY, RUNNER_END = _a.RUNNER_END;
    return new bluebird_1.default(function (resolve) {
        hermione.on(TEST_PENDING, function (testResult) { return reportBuilder.addSkipped(testResult); });
        hermione.on(TEST_PASS, function (testResult) { return reportBuilder.addSuccess(testResult); });
        hermione.on(TEST_FAIL, failHandler);
        hermione.on(RETRY, failHandler);
        hermione.on(RUNNER_END, function (stats) { return resolve(reportBuilder.setStats(stats)); });
    });
    function failHandler(testResult) {
        var formattedResult = reportBuilder.format(testResult);
        return formattedResult.hasDiff()
            ? reportBuilder.addFail(testResult)
            : reportBuilder.addError(testResult);
    }
}
function prepareImages(hermione, pluginConfig, reportBuilder) {
    var reportPath = pluginConfig.path;
    var _a = hermione.events, TEST_PASS = _a.TEST_PASS, RETRY = _a.RETRY, TEST_FAIL = _a.TEST_FAIL, RUNNER_END = _a.RUNNER_END;
    function failHandler(testResult) {
        var formattedResult = reportBuilder.format(testResult);
        var actions = [reporter_helpers_1.saveTestImages(formattedResult, reportPath)];
        if (formattedResult.screenshot) {
            actions.push(reporter_helpers_1.saveBase64Screenshot(formattedResult, reportPath));
        }
        return bluebird_1.default.all(actions);
    }
    return new bluebird_1.default(function (resolve, reject) {
        var queue = bluebird_1.default.resolve();
        hermione.on(TEST_PASS, function (testResult) {
            // @ts-ignore
            queue = queue.then(function () { return reporter_helpers_1.saveTestImages(reportBuilder.format(testResult), reportPath); });
        });
        hermione.on(RETRY, function (testResult) {
            // @ts-ignore
            queue = queue.then(function () { return failHandler(testResult); });
        });
        hermione.on(TEST_FAIL, function (testResult) {
            // @ts-ignore
            queue = queue.then(function () { return failHandler(testResult); });
        });
        hermione.on(RUNNER_END, function () { return queue.then(resolve, reject); });
    });
}
//# sourceMappingURL=hermione.js.map