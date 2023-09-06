'use strict';

const os = require('os');
const PQueue = require('p-queue');
const {PluginAdapter} = require('./lib/plugin-adapter');
const {createWorkers} = require('./lib/workers/create-workers');
const {FAIL, SUCCESS} = require('./lib/constants');
const {hasDiff} = require('./lib/common-utils');
const {formatTestResult} = require('./lib/server-utils');

let workers;

module.exports = (hermione, opts) => {
    if (hermione.isWorker()) {
        return;
    }
    const plugin = PluginAdapter.create(hermione, opts);

    if (!plugin.isEnabled()) {
        return;
    }

    plugin
        .addApi()
        .addCliCommands()
        .init(prepare);

    hermione.on(hermione.events.RUNNER_START, (runner) => {
        workers = createWorkers(runner);
    });
};

async function prepare(hermione, reportBuilder, pluginConfig) {
    const {path: reportPath} = pluginConfig;
    const {imageHandler} = reportBuilder;

    const failHandler = async (testResult) => {
        const formattedResult = formatTestResult(testResult, FAIL, reportBuilder);
        const actions = [imageHandler.saveTestImages(formattedResult, workers)];

        if (formattedResult.errorDetails) {
            actions.push(formattedResult.saveErrorDetails(reportPath));
        }

        await Promise.all(actions);

        return formattedResult;
    };

    const addFail = (formattedResult) => {
        return hasDiff(formattedResult.assertViewResults)
            ? reportBuilder.addFail(formattedResult)
            : reportBuilder.addError(formattedResult);
    };

    return new Promise((resolve, reject) => {
        const queue = new PQueue({concurrency: os.cpus().length});
        const promises = [];

        hermione.on(hermione.events.TEST_PASS, testResult => {
            promises.push(queue.add(async () => {
                const formattedResult = formatTestResult(testResult, SUCCESS, reportBuilder);
                await imageHandler.saveTestImages(formattedResult, workers);

                return reportBuilder.addSuccess(formattedResult);
            }).catch(reject));
        });

        hermione.on(hermione.events.RETRY, testResult => {
            promises.push(queue.add(() => failHandler(testResult).then(addFail)).catch(reject));
        });

        hermione.on(hermione.events.TEST_FAIL, testResult => {
            promises.push(queue.add(() => failHandler(testResult).then(addFail)).catch(reject));
        });

        hermione.on(hermione.events.TEST_PENDING, testResult => {
            promises.push(queue.add(() => failHandler(testResult).then((testResult) => reportBuilder.addSkipped(testResult)).catch(reject)));
        });

        hermione.on(hermione.events.RUNNER_END, () => {
            return Promise.all(promises).then(resolve, reject);
        });
    });
}
