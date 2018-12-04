import Promise from 'bluebird';
import { TestAdapterType, ITestResult } from 'typings/test-adapter';
import { IPluginConfig } from 'typings/pluginConfig';
const PluginAdapter = require('./lib/plugin-adapter');
const utils = require('./lib/server-utils');
const {saveTestImages} = require('./lib/reporter-helpers');

module.exports = (gemini: any, opts: any) => {
    const plugin = PluginAdapter.create(gemini, opts, 'gemini');

    if (!plugin.isEnabled()) {
        return;
    }

    plugin
        .addCliCommands()
        .init(prepareData, prepareImages);
};

function prepareData(gemini: any, reportBuilder: TestAdapterType) {
    return new Promise((resolve) => {
        gemini.on(gemini.events.SKIP_STATE, (result: ITestResult) => reportBuilder.addSkipped(result));

        gemini.on(gemini.events.TEST_RESULT, (result: ITestResult) => {
            return result.equal ? reportBuilder.addSuccess(result) : reportBuilder.addFail(result);
        });

        gemini.on(gemini.events.UPDATE_RESULT, (result: ITestResult) => reportBuilder.addSuccess(result));

        gemini.on(gemini.events.RETRY, (result: ITestResult) => reportBuilder.addRetry(result));

        gemini.on(gemini.events.ERROR, (result: ITestResult) => reportBuilder.addError(result));

        gemini.on(gemini.events.END, (stats: any) => resolve(reportBuilder.setStats(stats)));
    });
}

function prepareImages(gemini: any, pluginConfig: IPluginConfig, reportBuilder: TestAdapterType) {
    const {path: reportPath} = pluginConfig;

    function handleErrorEvent(result: ITestResult) {
        const src = (result.getImagePath && result.getImagePath()) || result.currentPath;

        return src && utils.copyImageAsync(src, utils.getCurrentAbsolutePath(result, reportPath));
    }

    return new Promise((resolve, reject) => {
        let queue = Promise.resolve();

        gemini.on(gemini.events.ERROR, (testResult: ITestResult) => {
            queue = queue.then(() => handleErrorEvent(reportBuilder.format(testResult)));
        });

        gemini.on(gemini.events.RETRY, (testResult: ITestResult) => {
            const formattedResult = reportBuilder.format(testResult);

            queue = queue.then(() => {
                return formattedResult.hasDiff()
                    ? saveTestImages(formattedResult, reportPath)
                    : handleErrorEvent(formattedResult);
            });
        });

        gemini.on(gemini.events.TEST_RESULT, (testResult: ITestResult) => {
            queue = queue.then(() => saveTestImages(reportBuilder.format(testResult), reportPath));
        });

        gemini.on(gemini.events.UPDATE_RESULT, (testResult: ITestResult) => {
            testResult = Object.assign(testResult, {
                referencePath: testResult.imagePath,
                equal: true
            });

            queue = queue.then(() => saveTestImages(reportBuilder.format(testResult), reportPath));
        });

        // @ts-ignore
        gemini.on(gemini.events.END, () => queue.then(resolve, reject));
    });
}
