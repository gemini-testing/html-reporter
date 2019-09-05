'use strict';

const clientEvents = require('../../constants/client-events');
const {RUNNING} = require('../../../constants/test-statuses');
const {getSuitePath} = require('../../../plugin-utils').getHermioneUtils();
const utils = require('../utils');
const createHermioneWorkers = require('../../../workers/create-hermione-workers');

let workers;

module.exports = (hermione, reportBuilder, client, reportPath) => {
    function failHandler(formattedResult) {
        const actions = [formattedResult.saveTestImages(reportPath, workers)];

        if (formattedResult.screenshot) {
            actions.push(formattedResult.saveBase64Screenshot(reportPath));
        }

        return Promise.all(actions);
    }

    hermione.on(hermione.events.RUNNER_START, (runner) => {
        workers = createHermioneWorkers(runner);
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

    hermione.on(hermione.events.TEST_PASS, (data) => {
        const formattedResult = reportBuilder.format(data, hermione.events.TEST_PASS);
        formattedResult.attempt = reportBuilder.getCurrAttempt(formattedResult);

        return formattedResult.saveTestImages(reportPath, workers)
            .then(() => {
                reportBuilder.addSuccess(formattedResult);

                const testResult = utils.findTestResult(
                    reportBuilder.getSuites(),
                    formattedResult.prepareTestResult()
                );

                return client.emit(clientEvents.TEST_RESULT, testResult);
            });
    });

    hermione.on(hermione.events.TEST_FAIL, (data) => {
        const formattedResult = reportBuilder.format(data, hermione.events.TEST_FAIL);
        formattedResult.attempt = reportBuilder.getCurrAttempt(formattedResult);

        return failHandler(formattedResult)
            .then(() => {
                formattedResult.hasDiff()
                    ? reportBuilder.addFail(formattedResult)
                    : reportBuilder.addError(formattedResult);
                const testResult = utils.findTestResult(reportBuilder.getSuites(), formattedResult.prepareTestResult());

                client.emit(clientEvents.TEST_RESULT, testResult);
            });
    });

    hermione.on(hermione.events.RETRY, (data) => {
        const formattedResult = reportBuilder.format(data, hermione.events.RETRY);
        formattedResult.attempt = reportBuilder.getCurrAttempt(formattedResult);

        return failHandler(formattedResult).then(() => reportBuilder.addRetry(formattedResult));
    });

    hermione.on(hermione.events.TEST_PENDING, (data) => {
        const formattedResult = reportBuilder.format(data, hermione.events.TEST_PENDING);
        formattedResult.attempt = reportBuilder.getCurrAttempt(formattedResult);

        return failHandler(formattedResult)
            .then(() => {
                reportBuilder.addSkipped(formattedResult);
                const testResult = utils.findTestResult(reportBuilder.getSuites(), formattedResult.prepareTestResult());

                return client.emit(clientEvents.TEST_RESULT, testResult);
            });
    });

    hermione.on(hermione.events.RUNNER_END, () => {
        return reportBuilder
            .save()
            .then(() => client.emit(clientEvents.END));
    });
};
