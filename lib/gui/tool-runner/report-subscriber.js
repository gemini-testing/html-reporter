'use strict';

const clientEvents = require('../constants/client-events');
const {RUNNING} = require('../../constants/test-statuses');
const {getSuitePath} = require('../../plugin-utils').getHermioneUtils();
const utils = require('./utils');
const createWorkers = require('../../workers/create-workers');
const {logError} = require('../../server-utils');

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
        try {
            if (suite.pending) {
                return;
            }

            client.emit(clientEvents.BEGIN_SUITE, {
                name: suite.title,
                suitePath: getSuitePath(suite),
                status: RUNNING
            });
        } catch (err) {
            logError(err);
            process.exit(1);
        }
    });

    hermione.on(hermione.events.TEST_BEGIN, (data) => {
        try {
            const {browserId} = data;

            client.emit(clientEvents.BEGIN_STATE, {
                suitePath: getSuitePath(data),
                browserId,
                status: RUNNING
            });
        } catch (err) {
            logError(err);
            process.exit(1);
        }
    });

    hermione.on(hermione.events.TEST_PASS, async (data) => {
        try {
            const formattedResult = reportBuilder.format(data, hermione.events.TEST_PASS);
            formattedResult.attempt = reportBuilder.getCurrAttempt(formattedResult);

            await formattedResult.saveTestImages(reportPath, workers);
            await reportBuilder.addSuccess(formattedResult);
            const testResult = utils.findTestResult(
                reportBuilder.getSuites(),
                formattedResult.prepareTestResult()
            );

            return client.emit(clientEvents.TEST_RESULT, testResult);
        } catch (err) {
            logError(err);
            process.exit(1);
        }
    });

    hermione.on(hermione.events.TEST_FAIL, async (data) => {
        try {
            const formattedResult = reportBuilder.format(data, hermione.events.TEST_FAIL);
            formattedResult.attempt = reportBuilder.getCurrAttempt(formattedResult);

            await failHandler(formattedResult);
            formattedResult.hasDiff()
                ? await reportBuilder.addFail(formattedResult)
                : await reportBuilder.addError(formattedResult);
            const testResult = utils.findTestResult(reportBuilder.getSuites(), formattedResult.prepareTestResult());

            return client.emit(clientEvents.TEST_RESULT, testResult);
        } catch (err) {
            logError(err);
            process.exit(1);
        }
    });

    hermione.on(hermione.events.RETRY, async (data) => {
        try {
            const formattedResult = reportBuilder.format(data, hermione.events.RETRY);
            formattedResult.attempt = reportBuilder.getCurrAttempt(formattedResult);

            await failHandler(formattedResult);
            await reportBuilder.addRetry(formattedResult);
        } catch (err) {
            logError(err);
            process.exit(1);
        }
    });

    hermione.on(hermione.events.TEST_PENDING, async (data) => {
        try {
            const formattedResult = reportBuilder.format(data, hermione.events.TEST_PENDING);
            formattedResult.attempt = reportBuilder.getCurrAttempt(formattedResult);

            await failHandler(formattedResult);
            await reportBuilder.addSkipped(formattedResult);
            const testResult = utils.findTestResult(reportBuilder.getSuites(), formattedResult.prepareTestResult());

            return client.emit(clientEvents.TEST_RESULT, testResult);
        } catch (err) {
            logError(err);
            process.exit(1);
        }
    });

    hermione.on(hermione.events.RUNNER_END, async () => {
        try {
            await reportBuilder.save();

            return client.emit(clientEvents.END);
        } catch (err) {
            logError(err);
            process.exit(1);
        }
    });
};
