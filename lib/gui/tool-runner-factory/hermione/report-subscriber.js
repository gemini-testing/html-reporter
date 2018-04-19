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
        const {browserId} = data;

        client.emit(clientEvents.BEGIN_STATE, {
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
        const testResult = prepareTestResult(data);
        const formattedResult = reportBuilder.format(data);
        const saveImageFn = getSaveImageFn(formattedResult);
        const {assertViewState} = formattedResult;

        const result = formattedResult.hasDiff()
            ? reportBuilder.addFail(data, {assertViewState})
            : reportBuilder.addError(data, {assertViewState});

        saveImageFn(result, reportPath)
            .then(() => client.emit(clientEvents.TEST_RESULT, testResult));
    });

    hermione.on(hermione.events.RETRY, (data) => {
        const result = reportBuilder.addRetry(data);
        const saveImageFn = getSaveImageFn(result);

        saveImageFn(result, reportPath);
    });

    // TODO: subscribe on hermione event when it will be added
    hermione.on(clientEvents.UPDATE_RESULT, (data) => {
        const result = reportBuilder.addUpdated(data);
        const testResult = prepareTestResult(data);

        updateReferenceImage(_.extend(result, {actualPath: data.actualPath}), reportPath)
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
};

function getSaveImageFn(formattedResult) {
    if (formattedResult.hasDiff()) {
        return saveTestImages;
    }

    return formattedResult.assertViewState ? saveTestCurrentImage : saveBase64Screenshot;
}
