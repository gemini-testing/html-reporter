'use strict';

const clientEvents = require('../constants/client-events');
const {RUNNING} = require('../../constants/test-statuses');
const {getSuitePath} = require('../../plugin-utils').getHermioneUtils();
const {findTestResult, withErrorHandling} = require('./utils');
const createWorkers = require('../../workers/create-workers');

let workers;

module.exports = (hermione, reportBuilder, client, reportPath) => {
    function failHandler(formattedResult) {
        const actions = [formattedResult.saveTestImages(reportPath, workers)];

        if (formattedResult.screenshot) {
            actions.push(formattedResult.saveBase64Screenshot(reportPath));
        }

        if (formattedResult.errorDetails) {
            actions.push(formattedResult.saveErrorDetails(reportPath));
        }

        return Promise.all(actions);
    }

    hermione.on(hermione.events.RUNNER_START, (runner) => {
        workers = createWorkers(runner);
    });

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

    hermione.on(hermione.events.TEST_PASS, async (data) => {
        await withErrorHandling(async () => {
            const formattedResult = reportBuilder.format(data, hermione.events.TEST_PASS);
            formattedResult.attempt = reportBuilder.getCurrAttempt(formattedResult);

            await formattedResult.saveTestImages(reportPath, workers);
            reportBuilder.addSuccess(formattedResult);
            const testResult = findTestResult(
                reportBuilder.getSuites(),
                formattedResult.prepareTestResult()
            );

            return client.emit(clientEvents.TEST_RESULT, testResult);
        });
    });

    hermione.on(hermione.events.TEST_FAIL, async (data) => {
        await withErrorHandling(async () => {
            const formattedResult = reportBuilder.format(data, hermione.events.TEST_FAIL);
            formattedResult.attempt = reportBuilder.getCurrAttempt(formattedResult);

            await failHandler(formattedResult);
            formattedResult.hasDiff()
                ? reportBuilder.addFail(formattedResult)
                : reportBuilder.addError(formattedResult);
            const testResult = findTestResult(reportBuilder.getSuites(), formattedResult.prepareTestResult());

            return client.emit(clientEvents.TEST_RESULT, testResult);
        });
    });

    hermione.on(hermione.events.RETRY, async (data) => {
        await withErrorHandling(async () => {
            const formattedResult = reportBuilder.format(data, hermione.events.RETRY);
            formattedResult.attempt = reportBuilder.getCurrAttempt(formattedResult);

            await failHandler(formattedResult);
            reportBuilder.addRetry(formattedResult);
        });
    });

    hermione.on(hermione.events.TEST_PENDING, async (data) => {
        await withErrorHandling(async () => {
            const formattedResult = reportBuilder.format(data, hermione.events.TEST_PENDING);
            formattedResult.attempt = reportBuilder.getCurrAttempt(formattedResult);

            await failHandler(formattedResult);
            reportBuilder.addSkipped(formattedResult);
            const testResult = findTestResult(reportBuilder.getSuites(), formattedResult.prepareTestResult());

            return client.emit(clientEvents.TEST_RESULT, testResult);
        });
    });

    hermione.on(hermione.events.RUNNER_END, async () => {
        return client.emit(clientEvents.END);
    });
};
