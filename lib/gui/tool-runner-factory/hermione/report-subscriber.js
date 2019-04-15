'use strict';

const clientEvents = require('../../constants/client-events');
const {RUNNING} = require('../../../constants/test-statuses');
const {getSuitePath} = require('../../../plugin-utils').getHermioneUtils();
const utils = require('../utils');
const reporterHelper = require('../../../reporter-helpers');
const createHermioneWorkers = require('../../../workers/create-hermione-workers');

let workers;

module.exports = (hermione, reportBuilder, client, reportPath) => {
    function failHandler(testResult) {
        const formattedResult = reportBuilder.format(testResult);
        const actions = [formattedResult.saveTestImages(reportPath, workers)];

        if (formattedResult.screenshot) {
            actions.push(reporterHelper.saveBase64Screenshot(formattedResult, reportPath));
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
        const formattedTest = reportBuilder.addSuccess(data);
        const testResult = utils.findTestResult(reportBuilder.getSuites(), formattedTest.prepareTestResult());

        formattedTest.saveTestImages(reportPath, workers)
            .then(() => client.emit(clientEvents.TEST_RESULT, testResult));
    });

    hermione.on(hermione.events.TEST_FAIL, (data) => {
        const formattedResult = reportBuilder.format(data);

        formattedResult.hasDiff()
            ? reportBuilder.addFail(data)
            : reportBuilder.addError(data);

        const testResult = utils.findTestResult(reportBuilder.getSuites(), formattedResult.prepareTestResult());
        failHandler(data)
            .then(() => client.emit(clientEvents.TEST_RESULT, testResult));
    });

    hermione.on(hermione.events.RETRY, (data) => {
        reportBuilder.addRetry(data);

        failHandler(data);
    });

    hermione.on(hermione.events.TEST_PENDING, (data) => {
        reportBuilder.addSkipped(data);

        const formattedResult = reportBuilder.format(data);
        const testResult = utils.findTestResult(reportBuilder.getSuites(), formattedResult.prepareTestResult());

        return failHandler(data)
            .then(() => client.emit(clientEvents.TEST_RESULT, testResult));
    });

    hermione.on(hermione.events.RUNNER_END, () => {
        return reportBuilder
            .save()
            .then(() => client.emit(clientEvents.END));
    });
};
