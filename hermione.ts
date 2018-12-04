import Promise from 'bluebird';
const PluginAdapter = require('./lib/plugin-adapter');
import {saveTestImages, saveBase64Screenshot} from './lib/reporter-helpers';

import {IOptions, IHermione, IStats} from 'typings/hermione';
import {ITestResult, TestAdapterType} from 'typings/test-adapter';

module.exports = (hermione: IHermione, opts: IOptions) => {
    const plugin = PluginAdapter.create(hermione, opts, 'hermione');

    if (!plugin.isEnabled()) return;

    plugin
        .addCliCommands()
        .init(prepareData, prepareImages);
};

function prepareData(hermione: IHermione, reportBuilder: TestAdapterType) {
    const {TEST_PENDING, TEST_PASS, TEST_FAIL, RETRY, RUNNER_END} = hermione.events;

    return new Promise((resolve: any) => {
        hermione.on(TEST_PENDING, (testResult: ITestResult) => reportBuilder.addSkipped(testResult));

        hermione.on(TEST_PASS, (testResult: ITestResult) => reportBuilder.addSuccess(testResult));

        hermione.on(TEST_FAIL, failHandler);

        hermione.on(RETRY, failHandler);

        hermione.on(RUNNER_END, (stats: IStats) => resolve(reportBuilder.setStats(stats)));
    });

    function failHandler(testResult: ITestResult) {
        const formattedResult = reportBuilder.format(testResult);

        return formattedResult.hasDiff()
            ? reportBuilder.addFail(testResult)
            : reportBuilder.addError(testResult);
    }
}

function prepareImages(
    hermione: IHermione,
    pluginConfig: IOptions,
    reportBuilder: TestAdapterType
) {
    const {path: reportPath} = pluginConfig;
    const {TEST_PASS, RETRY, TEST_FAIL, RUNNER_END} = hermione.events;

    function failHandler(testResult: ITestResult) {
        const formattedResult = reportBuilder.format(testResult);
        const actions = [saveTestImages(formattedResult, reportPath)];

        if (formattedResult.screenshot) {
            actions.push(saveBase64Screenshot(formattedResult, reportPath));
        }

        return Promise.all(actions);
    }

    return new Promise((resolve: any, reject: any) => {
        let queue = Promise.resolve();

        hermione.on(TEST_PASS, (testResult: ITestResult) => {
            // @ts-ignore
            queue = queue.then(() => saveTestImages(reportBuilder.format(testResult), reportPath));
        });

        hermione.on(RETRY, (testResult: ITestResult) => {
            // @ts-ignore
            queue = queue.then(() => failHandler(testResult));
        });

        hermione.on(TEST_FAIL, (testResult: ITestResult) => {
            // @ts-ignore
            queue = queue.then(() => failHandler(testResult));
        });

        hermione.on(RUNNER_END, () => queue.then(resolve, reject));
    });
}
