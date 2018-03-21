'use strict';

const _ = require('lodash');
const {RUNNING} = require('../../../constants/test-statuses');
const {findNode} = require('../../../../lib/static/modules/utils');
const {saveTestImages, saveTestCurrentImage, updateReferenceImage} = require('../../../reporter-helpers');

module.exports = (gemini, reportBuilder, client, reportPath) => {
    const proxy = (event) => {
        gemini.on(event, (...data) => {
            client.emit(event, ...data);
        });
    };

    proxy(gemini.events.BEGIN);

    gemini.on(gemini.events.BEGIN_SUITE, ({suite, browserId}) => {
        const {name, path: suitePath} = suite;
        if (suite.shouldSkip(browserId)) {
            return;
        }

        client.emit(gemini.events.BEGIN_SUITE, {
            name,
            suitePath,
            status: RUNNING
        });
    });

    gemini.on(gemini.events.BEGIN_STATE, (data) => {
        const {name, suite: {path: suitePath}} = data.state;
        client.emit(gemini.events.BEGIN_STATE, {
            name,
            suitePath,
            browserId: data.browserId,
            status: RUNNING
        });
    });

    gemini.on(gemini.events.TEST_RESULT, (data) => {
        data.equal
            ? reportBuilder.addSuccess(data)
            : reportBuilder.addFail(data);

        const testResult = prepareTestResult(data);

        saveTestImages(reportBuilder.format(data), reportPath)
            .then(() => client.emit(gemini.events.TEST_RESULT, testResult));
    });

    gemini.on(gemini.events.ERROR, (error) => {
        reportBuilder.addError(error);

        const testResult = prepareTestResult(error);

        saveTestCurrentImage(reportBuilder.format(error), reportPath)
            .then(() => client.emit(gemini.events.ERROR, testResult));
    });

    gemini.on(gemini.events.RETRY, (data) => {
        reportBuilder.addRetry(data);
        const formattedResult = reportBuilder.format(data);

        const actionFn = formattedResult.hasDiff()
            ? saveTestImages
            : saveTestCurrentImage;

        actionFn(formattedResult, reportPath);
    });

    gemini.on(gemini.events.UPDATE_RESULT, (data) => {
        reportBuilder.addUpdated(data);
        const testResult = prepareTestResult(data);

        updateReferenceImage(reportBuilder.format(data), reportPath)
            .then(() => client.emit(gemini.events.UPDATE_RESULT, testResult));
    });

    gemini.on(gemini.events.END_RUNNER, () => reportBuilder.save());

    proxy(gemini.events.SKIP_STATE);
    proxy(gemini.events.END_STATE);
    proxy(gemini.events.END_SUITE);

    function prepareTestResult(test) {
        const {state: {name}, suite, browserId} = test;
        const suitePath = suite.path.concat(name);
        const nodeResult = findNode(reportBuilder.getSuites(), suitePath);
        const browserResult = _.find(nodeResult.browsers, {name: browserId});

        return {name, suitePath, browserId, browserResult};
    }
};
