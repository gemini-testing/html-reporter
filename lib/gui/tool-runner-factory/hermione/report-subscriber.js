'use strict';

const clientEvents = require('../../constants/client-events');
const {RUNNING} = require('../../../constants/test-statuses');
const {getSuitePath} = require('../../../plugin-utils').getHermioneUtils();
const {findTestResult} = require('../utils');
const {
    saveTestImages, saveTestCurrentImage, saveBase64Screenshot
} = require('../../../reporter-helpers');

module.exports = (hermione, reportBuilder, client, reportPath) => {
    hermione.on(hermione.events.SUITE_BEGIN, (suite) => {
        if (suite.pending) {
            return;
        }

        client.emit(clientEvents.BEGIN_SUITE, {
            name: suite.title,
            suitePath: getSuitePath(suite),
            status: RUNNING
        });
    });

    hermione.on(hermione.events.TEST_BEGIN, (data) => {
        const {browserId} = data;

        client.emit(clientEvents.BEGIN_STATE, {
            suitePath: getSuitePath(data),
            browserId,
            status: RUNNING
        });
    });

    hermione.on(hermione.events.TEST_PASS, (data) => {
        const formattedTest = reportBuilder.addSuccess(data);
        const testResult = findTestResult(reportBuilder.getSuites(), formattedTest.prepareTestResult());

        saveTestImages(formattedTest, reportPath)
            .then(() => client.emit(clientEvents.TEST_RESULT, testResult));
    });

    hermione.on(hermione.events.TEST_FAIL, (data) => {
        const formattedResult = reportBuilder.format(data);
        const saveImageFn = getSaveImageFn(formattedResult);
        const {assertViewState} = formattedResult;

        const result = formattedResult.hasDiff()
            ? reportBuilder.addFail(data, {assertViewState})
            : reportBuilder.addError(data, {assertViewState});

        const testResult = findTestResult(reportBuilder.getSuites(), formattedResult.prepareTestResult());
        saveImageFn(result, reportPath, assertViewState)
            .then(() => client.emit(clientEvents.TEST_RESULT, testResult));
    });

    hermione.on(hermione.events.RETRY, (data) => {
        const result = reportBuilder.addRetry(data);
        const {assertViewState} = result;
        const saveImageFn = getSaveImageFn(result);

        saveImageFn(result, reportPath, assertViewState);
    });

    hermione.on(hermione.events.RUNNER_END, () => {
        return reportBuilder.save()
            .then(() => client.emit(clientEvents.END));
    });
};

function getSaveImageFn(formattedResult) {
    if (formattedResult.hasDiff()) {
        return saveTestImages;
    }

    return formattedResult.assertViewState ? saveTestCurrentImage : saveBase64Screenshot;
}
