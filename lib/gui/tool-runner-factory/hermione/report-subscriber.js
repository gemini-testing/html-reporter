'use strict';

const _ = require('lodash');
const clientEvents = require('../../constants/client-events');
const {RUNNING} = require('../../../constants/test-statuses');
const {findNode} = require('../../../../lib/static/modules/utils');
const {getSuitePath} = require('../../../plugin-utils').getHermioneUtils();
const {
    saveTestImages, saveTestCurrentImage, updateReferenceImage, saveBase64Screenshot
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
        const {title: name, browserId} = data;

        client.emit(clientEvents.BEGIN_STATE, {
            name,
            suitePath: getSuitePath(data),
            browserId,
            status: RUNNING
        });
    });

    hermione.on(hermione.events.TEST_PASS, (data) => {
        reportBuilder.addSuccess(data);

        const testResult = prepareTestResult(data);

        client.emit(clientEvents.TEST_RESULT, testResult);
    });

    hermione.on(hermione.events.TEST_FAIL, (data) => {
        let formattedResult = reportBuilder.format(data);
        const {assertViewState} = formattedResult;

        formattedResult.hasDiff()
            ? reportBuilder.addFail(data, {assertViewState})
            : reportBuilder.addError(data, {assertViewState});

        const testResult = prepareTestResult(data);
        formattedResult = formatDataWithAttempt(data, testResult);
        const saveImageFn = getSaveImageFn(formattedResult);

        saveImageFn(formatDataWithAttempt(data, testResult), reportPath)
            .then(() => client.emit(clientEvents.TEST_RESULT, testResult));
    });

    hermione.on(hermione.events.RETRY, (data) => {
        reportBuilder.addRetry(data);

        const testResult = prepareTestResult(data);
        const formattedResult = formatDataWithAttempt(data, testResult);
        const saveImageFn = getSaveImageFn(formattedResult);

        saveImageFn(formattedResult, reportPath);
    });

    // TODO: subscribe on hermione event when it will be added
    hermione.on(clientEvents.UPDATE_RESULT, (data) => {
        reportBuilder.addUpdated(data);
        const testResult = prepareTestResult(data);

        updateReferenceImage(reportBuilder.format(data), reportPath)
            .then(() => client.emit(clientEvents.UPDATE_RESULT, testResult));
    });

    hermione.on(hermione.events.RUNNER_END, () => {
        return reportBuilder.save()
            .then(() => client.emit(clientEvents.END));
    });

    function prepareTestResult(test) {
        const {title: name, browserId, imagePath} = test;
        const suitePath = getSuitePath(test);
        const nodeResult = findNode(reportBuilder.getSuites(), suitePath);
        const browserResult = _.find(nodeResult.browsers, {name: browserId});

        return {name, suitePath, browserId, browserResult, imagePath};
    }

    function formatDataWithAttempt(data, testResult) {
        const {attempt} = testResult.browserResult.result;
        return reportBuilder.format(_.defaults({attempt}, data));
    }
};

function getSaveImageFn(formattedResult) {
    if (formattedResult.hasDiff()) {
        return saveTestImages;
    }

    return formattedResult.assertViewState ? saveTestCurrentImage : saveBase64Screenshot;
}
