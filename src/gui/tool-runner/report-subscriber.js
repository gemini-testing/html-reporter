'use strict';

const os = require('os');
const PQueue = require('p-queue');
const clientEvents = require('../constants/client-events');
const {RUNNING} = require('../../constants/test-statuses');
const {getSuitePath} = require('../../plugin-utils').getHermioneUtils();
const createWorkers = require('../../workers/create-workers');
const {logError} = require('../../server-utils');

let workers;

module.exports = (hermione, reportBuilder, client, reportPath) => {
    const queue = new PQueue({concurrency: os.cpus().length});

    function failHandler(formattedResult) {
        const actions = [formattedResult.saveTestImages(reportPath, workers)];

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
            status: RUNNING
        });
    });

    hermione.on(hermione.events.TEST_BEGIN, (data) => {
        const formattedResult = reportBuilder.format(data, RUNNING);
        formattedResult.attempt = reportBuilder.getCurrAttempt(formattedResult);

        reportBuilder.addRunning(formattedResult);
        const testBranch = reportBuilder.getTestBranch(formattedResult.id);

        return client.emit(clientEvents.BEGIN_STATE, testBranch);
    });

    hermione.on(hermione.events.TEST_PASS, (testResult) => {
        queue.add(async () => {
            const formattedResult = reportBuilder.format(testResult, hermione.events.TEST_PASS);
            formattedResult.attempt = reportBuilder.getCurrAttempt(formattedResult);

            await formattedResult.saveTestImages(reportPath, workers);
            reportBuilder.addSuccess(formattedResult);

            const testBranch = reportBuilder.getTestBranch(formattedResult.id);
            client.emit(clientEvents.TEST_RESULT, testBranch);
        }).catch(logError);
    });

    hermione.on(hermione.events.RETRY, (testResult) => {
        queue.add(async () => {
            const formattedResult = reportBuilder.format(testResult, hermione.events.RETRY);
            formattedResult.attempt = reportBuilder.getCurrAttempt(formattedResult);

            await failHandler(formattedResult);
            reportBuilder.addRetry(formattedResult);

            const testBranch = reportBuilder.getTestBranch(formattedResult.id);
            client.emit(clientEvents.TEST_RESULT, testBranch);
        }).catch(logError);
    });

    hermione.on(hermione.events.TEST_FAIL, (testResult) => {
        queue.add(async () => {
            const formattedResult = reportBuilder.format(testResult, hermione.events.TEST_FAIL);
            formattedResult.attempt = reportBuilder.getCurrAttempt(formattedResult);

            await failHandler(formattedResult);
            formattedResult.hasDiff()
                ? reportBuilder.addFail(formattedResult)
                : reportBuilder.addError(formattedResult);

            const testBranch = reportBuilder.getTestBranch(formattedResult.id);
            client.emit(clientEvents.TEST_RESULT, testBranch);
        }).catch(logError);
    });

    hermione.on(hermione.events.TEST_PENDING, async (testResult) => {
        queue.add(async () => {
            const formattedResult = reportBuilder.format(testResult, hermione.events.TEST_PENDING);
            formattedResult.attempt = reportBuilder.getCurrAttempt(formattedResult);

            await failHandler(formattedResult);
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
