'use strict';

const os = require('os');
const PQueue = require('p-queue');

const PluginAdapter = require('./lib/plugin-adapter');
const createHermioneWorkers = require('./lib/workers/create-hermione-workers');

let workers;

module.exports = (hermione, opts) => {
    const plugin = PluginAdapter.create(hermione, opts, 'hermione');

    if (!plugin.isEnabled()) {
        return;
    }

    plugin
        .addApi()
        .addCliCommands()
        .init(prepare);

    hermione.on(hermione.events.RUNNER_START, (runner) => {
        workers = createHermioneWorkers(runner);
    });
};

async function prepare(hermione, {reportBuilder, reportBuilderSqlite}, pluginConfig) {
    const {path: reportPath} = pluginConfig;

    const failHandler = async (testResult) => {
        const formattedResult = reportBuilder.format(testResult);
        const actions = [formattedResult.saveTestImages(reportPath, workers)];

        if (formattedResult.screenshot) {
            actions.push(formattedResult.saveBase64Screenshot(reportPath));
        }

        await Promise.all(actions);

        return formattedResult;
    };
    const failHandlerSqlite = async (testResult) => {
        const formattedResult = reportBuilderSqlite.format(testResult);
        const actions = [formattedResult.saveTestImages(reportPath, workers)];

        if (formattedResult.screenshot) {
            actions.push(formattedResult.saveBase64Screenshot(reportPath));
        }

        await Promise.all(actions);

        return formattedResult;
    };


    const addFail = (formattedResult) => {
        return formattedResult.hasDiff()
            ? reportBuilder.addFail(formattedResult)
            : reportBuilder.addError(formattedResult);
    };

    const addFailSqlite = (formattedResult) => {
        return formattedResult.hasDiff()
            ? reportBuilderSqlite.addFail(formattedResult)
            : reportBuilderSqlite.addError(formattedResult);
    };

    return new Promise((resolve, reject) => {
        const queue = new PQueue({concurrency: os.cpus().length});
        const promises = [];

        hermione.on(hermione.events.TEST_PASS, testResult => {
            promises.push(queue.add(async () => {

                const formattedResult = reportBuilder.format(testResult);
                // console.log("formattedResult");
                // console.log(formattedResult);
                await formattedResult.saveTestImages(reportPath, workers);
                return reportBuilder.addSuccess(formattedResult);
            }).catch(reject));

            if (reportBuilderSqlite) {
                promises.push(queue.add(async () => {
                    const formattedResultSqlite = reportBuilderSqlite.format(testResult);
                    // console.log("formattedResultSqlite");
                    // console.log(formattedResultSqlite);
                    await formattedResultSqlite.saveTestImages(reportPath, workers);
                    return reportBuilderSqlite.addSuccess(formattedResultSqlite);
                }).catch(reject));
            }


        });

        hermione.on(hermione.events.RETRY, testResult => {
            promises.push(queue.add(() => failHandler(testResult).then(addFail)).catch(reject));
            if (reportBuilderSqlite) {
                promises.push(queue.add(() => failHandlerSqlite(testResult).then(addFailSqlite)).catch(reject));
            }

        });

        hermione.on(hermione.events.TEST_FAIL, testResult => {
            promises.push(queue.add(() => failHandler(testResult).then(addFail)).catch(reject));
            if (reportBuilderSqlite) {
                promises.push(queue.add(() => failHandlerSqlite(testResult).then(addFailSqlite)).catch(reject));
            }
        });

        hermione.on(hermione.events.TEST_PENDING, testResult => {
            promises.push(queue.add(() => failHandler(testResult).then((testResult) => reportBuilder.addSkipped(testResult)).catch(reject)));
            if (reportBuilderSqlite) {
                promises.push(queue.add(() => failHandlerSqlite(testResult).then((testResult) => reportBuilderSqlite.addSkipped(testResult)).catch(reject)));
            }
        });

        hermione.on(hermione.events.RUNNER_END, (stats) => {
            reportBuilder
                .setStats(stats)
                .setApiValues(hermione.htmlReporter.values);

            if (reportBuilderSqlite) {
                reportBuilderSqlite
                    .setStats(stats)
                    .setApiValues(hermione.htmlReporter.values);
            }


            return Promise.all(promises).then(resolve, reject);
        });
    });
}
