'use strict';

const clientEvents = require('../../constants/client-events');
const {RUNNING} = require('../../../constants/test-statuses');
const {saveTestCurrentImage} = require('../../../reporter-helpers');
const {findTestResult} = require('../utils');

module.exports = (gemini, reportBuilder, client, reportPath) => {
    gemini.on(gemini.events.BEGIN_SUITE, ({suite, browserId}) => {
        const {name, path: suitePath} = suite;
        if (suite.shouldSkip(browserId)) {
            return;
        }

        client.emit(clientEvents.BEGIN_SUITE, {
            name,
            suitePath,
            status: RUNNING
        });
    });

    gemini.on(gemini.events.BEGIN_STATE, (data) => {
        const {name, suite: {path: suitePath}} = data.state;
        client.emit(clientEvents.BEGIN_STATE, {
            suitePath: suitePath.concat(name),
            browserId: data.browserId,
            status: RUNNING
        });
    });

    gemini.on(gemini.events.TEST_RESULT, (data) => {
        const formattedResult = data.equal
            ? reportBuilder.addSuccess(data)
            : reportBuilder.addFail(data);

        const testResult = findTestResult(reportBuilder.getSuites(), formattedResult.prepareTestResult());

        formattedResult.saveTestImages(reportPath)
            .then(() => client.emit(clientEvents.TEST_RESULT, testResult));
    });

    gemini.on(gemini.events.ERROR, (error) => {
        const formattedResult = reportBuilder.addError(error);
        const testResult = findTestResult(reportBuilder.getSuites(), formattedResult.prepareTestResult());

        saveTestCurrentImage(formattedResult, reportPath)
            .then(() => client.emit(gemini.events.ERROR, testResult));
    });

    gemini.on(gemini.events.RETRY, (data) => {
        const formattedResult = reportBuilder.addRetry(data);

        return formattedResult.hasDiff()
            ? formattedResult.saveTestImages(reportPath)
            : saveTestCurrentImage(formattedResult, reportPath);
    });

    gemini.on(gemini.events.END_RUNNER, () => {
        return reportBuilder
            .save()
            .then(() => client.emit(clientEvents.END));
    });
};
