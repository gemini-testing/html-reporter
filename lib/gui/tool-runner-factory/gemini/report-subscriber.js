'use strict';

const _ = require('lodash');
const clientEvents = require('../../constants/client-events');
const {RUNNING} = require('../../../constants/test-statuses');
const {findNode} = require('../../../../lib/static/modules/utils');
const {saveTestImages, saveTestCurrentImage, updateReferenceImage} = require('../../../reporter-helpers');

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
            name,
            suitePath,
            browserId: data.browserId,
            status: RUNNING
        });
    });

    gemini.on(gemini.events.TEST_RESULT, (data) => {
        const result = data.equal
            ? reportBuilder.addSuccess(data)
            : reportBuilder.addFail(data);

        const testResult = prepareTestResult(data);

        saveTestImages(result, reportPath)
            .then(() => client.emit(clientEvents.TEST_RESULT, testResult));
    });

    gemini.on(gemini.events.ERROR, (error) => {
        const result = reportBuilder.addError(error);

        const testResult = prepareTestResult(error);

        saveTestCurrentImage(result, reportPath)
            .then(() => client.emit(gemini.events.ERROR, testResult));
    });

    gemini.on(gemini.events.RETRY, (data) => {
        const result = reportBuilder.addRetry(data);

        const actionFn = result.hasDiff()
            ? saveTestImages
            : saveTestCurrentImage;

        actionFn(result, reportPath);
    });

    gemini.on(gemini.events.UPDATE_RESULT, (data) => {
        const result = reportBuilder.addUpdated(data);
        const testResult = prepareTestResult(data);

        updateReferenceImage(result, reportPath)
            .then(() => client.emit(clientEvents.UPDATE_RESULT, testResult));
    });

    gemini.on(gemini.events.END_RUNNER, () => {
        return reportBuilder.save().then(() => client.emit(clientEvents.END));
    });

    function prepareTestResult(test) {
        const {state: {name}, suite, browserId} = test;
        const suitePath = suite.path.concat(name);
        const nodeResult = findNode(reportBuilder.getSuites(), suitePath);
        const browserResult = _.find(nodeResult.browsers, {name: browserId});

        return {name, suitePath, browserId, browserResult};
    }
};
