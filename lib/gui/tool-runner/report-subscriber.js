'use strict';

const os = require('os');
const PQueue = require('p-queue');
const clientEvents = require('../constants/client-events');
const {getSuitePath} = require('../../plugin-utils');
const {createWorkers} = require('../../workers/create-workers');
const {logError, formatTestResult} = require('../../server-utils');
const {hasDiff} = require('../../common-utils');
const {TestStatus, RUNNING, SUCCESS, SKIPPED} = require('../../constants');

let workers;

module.exports = (hermione, reportBuilder, client, reportPath) => {
    const queue = new PQueue({concurrency: os.cpus().length});
    const {imageHandler} = reportBuilder;

    function failHandler(testResult, formattedResult) {
        const actions = [imageHandler.saveTestImages(formattedResult, workers)];

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
            suiteId: getSuitePath(suite).join(' '),
            status: TestStatus.RUNNING
        });
    });

    hermione.on(hermione.events.TEST_BEGIN, (data) => {
        const formattedResult = formatTestResult(data, RUNNING, reportBuilder);
        formattedResult.attempt = reportBuilder.getCurrAttempt(formattedResult);

        reportBuilder.addRunning(formattedResult);
        const testBranch = reportBuilder.getTestBranch(formattedResult.id);

        return client.emit(clientEvents.BEGIN_STATE, testBranch);
    });

    hermione.on(hermione.events.TEST_PASS, (testResult) => {
        queue.add(async () => {
            const formattedResult = formatTestResult(testResult, SUCCESS, reportBuilder);
            formattedResult.attempt = reportBuilder.getCurrAttempt(formattedResult);

            await imageHandler.saveTestImages(formattedResult, workers);
            reportBuilder.addSuccess(formattedResult);

            const testBranch = reportBuilder.getTestBranch(formattedResult.id);
            client.emit(clientEvents.TEST_RESULT, testBranch);
        }).catch(logError);
    });

    hermione.on(hermione.events.RETRY, (testResult) => {
        queue.add(async () => {
            const status = hasDiff(testResult.assertViewResults) ? TestStatus.FAIL : TestStatus.ERROR;
            const formattedResult = formatTestResult(testResult, status, reportBuilder);
            formattedResult.attempt = reportBuilder.getCurrAttempt(formattedResult);

            await failHandler(testResult, formattedResult);
            reportBuilder.addRetry(formattedResult);

            const testBranch = reportBuilder.getTestBranch(formattedResult.id);
            client.emit(clientEvents.TEST_RESULT, testBranch);
        }).catch(logError);
    });

    hermione.on(hermione.events.TEST_FAIL, (testResult) => {
        queue.add(async () => {
            const status = hasDiff(testResult.assertViewResults) ? TestStatus.FAIL : TestStatus.ERROR;
            const formattedResult = formatTestResult(testResult, status, reportBuilder);
            formattedResult.attempt = reportBuilder.getCurrAttempt(formattedResult);

            await failHandler(testResult, formattedResult);
            status === TestStatus.FAIL
                ? reportBuilder.addFail(formattedResult)
                : reportBuilder.addError(formattedResult);

            const testBranch = reportBuilder.getTestBranch(formattedResult.id);
            client.emit(clientEvents.TEST_RESULT, testBranch);
        }).catch(logError);
    });

    hermione.on(hermione.events.TEST_PENDING, async (testResult) => {
        queue.add(async () => {
            const formattedResult = formatTestResult(testResult, SKIPPED, reportBuilder);
            formattedResult.attempt = reportBuilder.getCurrAttempt(formattedResult);

            await failHandler(testResult, formattedResult);
            reportBuilder.addSkipped(formattedResult);

            const testBranch = reportBuilder.getTestBranch(formattedResult.id);
            client.emit(clientEvents.TEST_RESULT, testBranch);
        }).catch(logError);
    });

    hermione.on(hermione.events.RUNNER_END, async () => {
        try {
            await queue.onIdle();
            client.emit(clientEvents.END);
        } catch (err) {
            logError(err);
        }
    });
};
