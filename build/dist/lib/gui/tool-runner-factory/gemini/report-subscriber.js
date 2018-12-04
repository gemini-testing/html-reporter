"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var clientEvents = require('../../constants/client-events');
var RUNNING = require('../../../constants/test-statuses').RUNNING;
var _a = require('../../../reporter-helpers'), saveTestImages = _a.saveTestImages, saveTestCurrentImage = _a.saveTestCurrentImage;
var findTestResult = require('../utils').findTestResult;
module.exports = function (gemini, reportBuilder, client, reportPath) {
    gemini.on(gemini.events.BEGIN_SUITE, function (_a) {
        var suite = _a.suite, browserId = _a.browserId;
        var name = suite.name, suitePath = suite.path;
        if (suite.shouldSkip(browserId)) {
            return;
        }
        client.emit(clientEvents.BEGIN_SUITE, {
            name: name,
            suitePath: suitePath,
            status: RUNNING
        });
    });
    gemini.on(gemini.events.BEGIN_STATE, function (data) {
        var _a = data.state, name = _a.name, suitePath = _a.suite.path;
        client.emit(clientEvents.BEGIN_STATE, {
            suitePath: suitePath.concat(name),
            browserId: data.browserId,
            status: RUNNING
        });
    });
    gemini.on(gemini.events.TEST_RESULT, function (data) {
        var formattedResult = data.equal
            ? reportBuilder.addSuccess(data)
            : reportBuilder.addFail(data);
        var testResult = findTestResult(reportBuilder.getSuites(), formattedResult.prepareTestResult());
        saveTestImages(formattedResult, reportPath)
            .then(function () { return client.emit(clientEvents.TEST_RESULT, testResult); });
    });
    gemini.on(gemini.events.ERROR, function (error) {
        var formattedResult = reportBuilder.addError(error);
        var testResult = findTestResult(reportBuilder.getSuites(), formattedResult.prepareTestResult());
        saveTestCurrentImage(formattedResult, reportPath)
            .then(function () { return client.emit(gemini.events.ERROR, testResult); });
    });
    gemini.on(gemini.events.RETRY, function (data) {
        var formattedResult = reportBuilder.addRetry(data);
        var actionFn = formattedResult.hasDiff()
            ? saveTestImages
            : saveTestCurrentImage;
        actionFn(formattedResult, reportPath);
    });
    gemini.on(gemini.events.END_RUNNER, function () {
        return reportBuilder.save().then(function () { return client.emit(clientEvents.END); });
    });
};
//# sourceMappingURL=report-subscriber.js.map