'use strict';
var clientEvents = require('../../constants/client-events');
var RUNNING = require('../../../constants/test-statuses').RUNNING;
var getSuitePath = require('../../../plugin-utils').getHermioneUtils().getSuitePath;
var findTestResult = require('../utils').findTestResult;
var _a = require('../../../reporter-helpers'), saveTestImages = _a.saveTestImages, saveBase64Screenshot = _a.saveBase64Screenshot;
module.exports = function (hermione, reportBuilder, client, reportPath) {
    function failHandler(testResult) {
        var formattedResult = reportBuilder.format(testResult);
        var actions = [saveTestImages(formattedResult, reportPath)];
        if (formattedResult.screenshot) {
            actions.push(saveBase64Screenshot(formattedResult, reportPath));
        }
        return Promise.all(actions);
    }
    hermione.on(hermione.events.SUITE_BEGIN, function (suite) {
        if (suite.pending) {
            return;
        }
        client.emit(clientEvents.BEGIN_SUITE, {
            name: suite.title,
            suitePath: getSuitePath(suite),
            status: RUNNING
        });
    });
    hermione.on(hermione.events.TEST_BEGIN, function (data) {
        var browserId = data.browserId;
        client.emit(clientEvents.BEGIN_STATE, {
            suitePath: getSuitePath(data),
            browserId: browserId,
            status: RUNNING
        });
    });
    hermione.on(hermione.events.TEST_PASS, function (data) {
        var formattedTest = reportBuilder.addSuccess(data);
        var testResult = findTestResult(reportBuilder.getSuites(), formattedTest.prepareTestResult());
        saveTestImages(formattedTest, reportPath)
            .then(function () { return client.emit(clientEvents.TEST_RESULT, testResult); });
    });
    hermione.on(hermione.events.TEST_FAIL, function (data) {
        var formattedResult = reportBuilder.format(data);
        formattedResult.hasDiff()
            ? reportBuilder.addFail(data)
            : reportBuilder.addError(data);
        var testResult = findTestResult(reportBuilder.getSuites(), formattedResult.prepareTestResult());
        failHandler(data)
            .then(function () { return client.emit(clientEvents.TEST_RESULT, testResult); });
    });
    hermione.on(hermione.events.RETRY, function (data) {
        reportBuilder.addRetry(data);
        failHandler(data);
    });
    hermione.on(hermione.events.RUNNER_END, function () {
        return reportBuilder.save()
            .then(function () { return client.emit(clientEvents.END); });
    });
};
//# sourceMappingURL=report-subscriber.js.map