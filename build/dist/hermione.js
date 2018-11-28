'use strict';
var Promise = require('bluebird');
var PluginAdapter = require('./lib/plugin-adapter');
var _a = require('./lib/reporter-helpers'), saveTestImages = _a.saveTestImages, saveBase64Screenshot = _a.saveBase64Screenshot;
module.exports = function (hermione, opts) {
    var plugin = PluginAdapter.create(hermione, opts, 'hermione');
    if (!plugin.isEnabled()) {
        return;
    }
    plugin
        .addCliCommands()
        .init(prepareData, prepareImages);
};
function prepareData(hermione, reportBuilder) {
    return new Promise(function (resolve) {
        hermione.on(hermione.events.TEST_PENDING, function (testResult) { return reportBuilder.addSkipped(testResult); });
        hermione.on(hermione.events.TEST_PASS, function (testResult) { return reportBuilder.addSuccess(testResult); });
        hermione.on(hermione.events.TEST_FAIL, failHandler);
        hermione.on(hermione.events.RETRY, failHandler);
        hermione.on(hermione.events.RUNNER_END, function (stats) { return resolve(reportBuilder.setStats(stats)); });
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
    function failHandler(testResult) {
        var formattedResult = reportBuilder.format(testResult);
        var actions = [saveTestImages(formattedResult, reportPath)];
        if (formattedResult.screenshot) {
            actions.push(saveBase64Screenshot(formattedResult, reportPath));
        }
        return Promise.all(actions);
    }
    return new Promise(function (resolve, reject) {
        var queue = Promise.resolve();
        hermione.on(hermione.events.TEST_PASS, function (testResult) {
            queue = queue.then(function () { return saveTestImages(reportBuilder.format(testResult), reportPath); });
        });
        hermione.on(hermione.events.RETRY, function (testResult) {
            queue = queue.then(function () { return failHandler(testResult); });
        });
        hermione.on(hermione.events.TEST_FAIL, function (testResult) {
            queue = queue.then(function () { return failHandler(testResult); });
        });
        hermione.on(hermione.events.RUNNER_END, function () { return queue.then(resolve, reject); });
    });
}
//# sourceMappingURL=hermione.js.map