'use strict';

const Bluebird = require('bluebird');
const PluginAdapter = require('./lib/plugin-adapter');
const {saveTestImages, saveBase64Screenshot} = require('./lib/reporter-helpers');

module.exports = (hermione: any, opts: any) => {
    const plugin = PluginAdapter.create(hermione, opts, 'hermione');

    if (!plugin.isEnabled()) {
        return;
    }

    plugin
        .addCliCommands()
        .init(prepareData, prepareImages);
};

function prepareData(hermione: any, reportBuilder: any) {
    return new Bluebird((resolve: any) => {
        hermione.on(hermione.events.TEST_PENDING, (testResult: any) => reportBuilder.addSkipped(testResult));

        hermione.on(hermione.events.TEST_PASS, (testResult: any) => reportBuilder.addSuccess(testResult));

        hermione.on(hermione.events.TEST_FAIL, failHandler);

        hermione.on(hermione.events.RETRY, failHandler);

        hermione.on(hermione.events.RUNNER_END, (stats: any) => resolve(reportBuilder.setStats(stats)));
    });

    function failHandler(testResult: any) {
        const formattedResult = reportBuilder.format(testResult);

        return formattedResult.hasDiff()
            ? reportBuilder.addFail(testResult)
            : reportBuilder.addError(testResult);
    }
}

function prepareImages(hermione: any, pluginConfig: any, reportBuilder: any) {
    const {path: reportPath} = pluginConfig;

    function failHandler(testResult: any) {
        const formattedResult = reportBuilder.format(testResult);
        const actions = [saveTestImages(formattedResult, reportPath)];

        if (formattedResult.screenshot) {
            actions.push(saveBase64Screenshot(formattedResult, reportPath));
        }

        return Bluebird.all(actions);
    }

    return new Bluebird((resolve: any, reject: any) => {
        let queue = Bluebird.resolve();

        hermione.on(hermione.events.TEST_PASS, (testResult: any) => {
            queue = queue.then(() => saveTestImages(reportBuilder.format(testResult), reportPath));
        });

        hermione.on(hermione.events.RETRY, (testResult: any) => {
            queue = queue.then(() => failHandler(testResult));
        });

        hermione.on(hermione.events.TEST_FAIL, (testResult: any) => {
            queue = queue.then(() => failHandler(testResult));
        });

        hermione.on(hermione.events.RUNNER_END, () => queue.then(resolve, reject));
    });
}
