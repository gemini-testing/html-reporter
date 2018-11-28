'use strict';
var Promise = require('bluebird');
var PluginAdapter = require('./lib/plugin-adapter');
var utils = require('./lib/server-utils');
var saveTestImages = require('./lib/reporter-helpers').saveTestImages;
module.exports = function (gemini, opts) {
    var plugin = PluginAdapter.create(gemini, opts, 'gemini');
    if (!plugin.isEnabled()) {
        return;
    }
    plugin
        .addCliCommands()
        .init(prepareData, prepareImages);
};
function prepareData(gemini, reportBuilder) {
    return new Promise(function (resolve) {
        gemini.on(gemini.events.SKIP_STATE, function (result) { return reportBuilder.addSkipped(result); });
        gemini.on(gemini.events.TEST_RESULT, function (result) {
            return result.equal ? reportBuilder.addSuccess(result) : reportBuilder.addFail(result);
        });
        gemini.on(gemini.events.UPDATE_RESULT, function (result) { return reportBuilder.addSuccess(result); });
        gemini.on(gemini.events.RETRY, function (result) { return reportBuilder.addRetry(result); });
        gemini.on(gemini.events.ERROR, function (result) { return reportBuilder.addError(result); });
        gemini.on(gemini.events.END, function (stats) { return resolve(reportBuilder.setStats(stats)); });
    });
}
function prepareImages(gemini, pluginConfig, reportBuilder) {
    var reportPath = pluginConfig.path;
    function handleErrorEvent(result) {
        var src = result.getImagePath() || result.currentPath;
        return src && utils.copyImageAsync(src, utils.getCurrentAbsolutePath(result, reportPath));
    }
    return new Promise(function (resolve, reject) {
        var queue = Promise.resolve();
        gemini.on(gemini.events.ERROR, function (testResult) {
            queue = queue.then(function () { return handleErrorEvent(reportBuilder.format(testResult)); });
        });
        gemini.on(gemini.events.RETRY, function (testResult) {
            var formattedResult = reportBuilder.format(testResult);
            queue = queue.then(function () {
                return formattedResult.hasDiff()
                    ? saveTestImages(formattedResult, reportPath)
                    : handleErrorEvent(formattedResult);
            });
        });
        gemini.on(gemini.events.TEST_RESULT, function (testResult) {
            queue = queue.then(function () { return saveTestImages(reportBuilder.format(testResult), reportPath); });
        });
        gemini.on(gemini.events.UPDATE_RESULT, function (testResult) {
            testResult = Object.assign(testResult, {
                referencePath: testResult.imagePath,
                equal: true
            });
            queue = queue.then(function () { return saveTestImages(reportBuilder.format(testResult), reportPath); });
        });
        gemini.on(gemini.events.END, function () { return queue.then(resolve, reject); });
    });
}
//# sourceMappingURL=gemini.js.map