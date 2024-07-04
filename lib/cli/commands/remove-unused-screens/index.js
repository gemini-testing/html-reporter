'use strict';

const path = require('path');
const fs = require('fs-extra');
const _ = require('lodash');
const ora = require('ora');
const chalk = require('chalk');
const filesize = require('filesize');
const Promise = require('bluebird');

const {commands} = require('../..');
const {getTestsFromFs, findScreens, askQuestion, identifyOutdatedScreens, identifyUnusedScreens, removeScreens} = require('./utils');
const {DATABASE_URLS_JSON_NAME, LOCAL_DATABASE_NAME} = require('../../../constants/database');
const {logger} = require('../../../common-utils');

const {REMOVE_UNUSED_SCREENS: commandName} = commands;

// TODO: remove hack after add ability to add controllers from plugin in silent mode
function proxyTool() {
    const proxyHandler = {
        get(target, prop) {
            return prop in target ? target[prop] : new Proxy(() => {}, this);
        },
        apply() {
            return new Proxy(() => {}, this);
        }
    };

    global.hermione = global.testplane = new Proxy(global.testplane || global.hermione || {}, proxyHandler);
}

module.exports = (program, toolAdapter) => {
    const toolName = program.name?.() || 'hermione';

    program
        .command(commandName)
        .description('remove screenshots which were not used when running tests')
        .option('-p, --pattern <pattern>', 'pattern for searching screenshots on the file system', collect)
        .option('--skip-questions', 'do not ask questions during execution (default values will be used)')
        .on('--help', () => logger.log(getHelpMessage(toolName)))
        .action(async (options) => {
            try {
                proxyTool();

                const {pattern: userPatterns} = options;

                if (_.isEmpty(userPatterns)) {
                    throw new Error(`option "pattern" is required. See examples of usage: ${chalk.green(`npx ${toolName} ${commandName} --help`)}`);
                }

                const userScreenPatterns = transformPatternOption(userPatterns);
                const spinner = ora({spinner: 'point'});

                spinner.start(`Reading ${toolName} tests from file system`);
                const fsTests = await getTestsFromFs(toolAdapter);
                spinner.succeed();

                logger.log(`${chalk.green(fsTests.count)} uniq tests were read in browsers: ${[...fsTests.browserIds].join(', ')}`);

                spinner.start(`Searching reference images on the file system by specified patterns:\n${userScreenPatterns.join('\n')}`);
                const foundScreenPaths = await findScreens(userScreenPatterns);
                spinner.succeed();

                logger.log(`Found ${chalk.green(foundScreenPaths.length)} reference images`);

                const shouldIdentifyOutdated = await askQuestion({
                    name: 'identifyOutdated',
                    type: 'confirm',
                    message: 'Identify outdated reference images (tests for them are removed)?',
                    default: true
                }, options);

                if (shouldIdentifyOutdated) {
                    await handleOutdatedScreens(foundScreenPaths, fsTests.screenPatterns, {spinner, cliOpts: options});
                }

                const shouldIdentifyUnused = await askQuestion({
                    name: 'identifyUnused',
                    type: 'confirm',
                    message: 'Identify unused reference images (tests passed successfully for them, but they were not used during execution)?',
                    default: true
                }, options);

                if (shouldIdentifyUnused) {
                    await handleUnusedScreens(foundScreenPaths, fsTests, {toolAdapter, spinner, cliOpts: options});
                }
            } catch (err) {
                logger.error(err.stack || err);
                process.exit(1);
            }
        });
};

async function handleOutdatedScreens(screenPaths, screenPatterns, opts = {}) {
    const {spinner} = opts;

    spinner.start(`Identifying outdated reference images (tests for these images do not exist)`);
    const outdatedScreenPaths = identifyOutdatedScreens(screenPaths, screenPatterns);
    spinner.succeed();

    await handleScreens(screenPaths, {paths: outdatedScreenPaths, type: 'outdated'}, opts);
}

async function handleUnusedScreens(screenPaths, fsTests, opts = {}) {
    const {toolAdapter, spinner, cliOpts} = opts;
    const {reporterConfig} = toolAdapter;
    const mainDatabaseUrls = path.resolve(reporterConfig.path, DATABASE_URLS_JSON_NAME);

    const isReportPathExists = await fs.pathExists(reporterConfig.path);
    if (!isReportPathExists) {
        throw new Error(`Can't find html-report in "${reporterConfig.path}" folder. You should run tests or download report from CI`);
    }

    spinner.start('Loading databases with the test results in order to identify unused screenshots in tests');
    const dbPaths = await toolAdapter.htmlReporter.downloadDatabases([mainDatabaseUrls], {pluginConfig: reporterConfig});
    spinner.succeed();

    if (_.isEmpty(dbPaths)) {
        throw new Error(`Databases were not loaded from "${mainDatabaseUrls}" file`);
    }

    const mergedDbPath = path.resolve(reporterConfig.path, LOCAL_DATABASE_NAME);
    const srcDbPaths = dbPaths.filter((dbPath) => dbPath !== mergedDbPath);

    if (!_.isEmpty(srcDbPaths)) {
        spinner.start('Merging databases');
        await toolAdapter.htmlReporter.mergeDatabases(srcDbPaths, reporterConfig.path);
        spinner.succeed();

        logger.log(`${chalk.green(srcDbPaths.length)} databases were merged to ${chalk.green(mergedDbPath)}`);
    }

    spinner.start(`Identifying unused reference images (tests passed successfully for them, but they were not used during execution)`);
    const unusedScreenPaths = identifyUnusedScreens(fsTests, {toolAdapter, mergedDbPath});
    spinner.succeed();

    await handleScreens(screenPaths, {paths: unusedScreenPaths, type: 'unused'}, {spinner, cliOpts});
}

async function handleScreens(allScreenPaths, screensToRemove, {spinner, cliOpts} = {}) {
    const existentScreenPaths = await Promise.filter(screensToRemove.paths, async screenPath => {
        try {
            await fs.access(screenPath);
            return true;
        } catch (err) {
            if (err.code === 'ENOENT') {
                logger.warn(
                    chalk.red(
                        `Screen by path: "${screenPath}" is not found in your file system. ` +
                        'Try to rebase your branch or download more recent report from CI.'
                    )
                );
                return false;
            }

            throw err;
        }
    });

    const screenPathsToRemoveLen = existentScreenPaths.length;

    logger.log(
        `Found ${chalk[screenPathsToRemoveLen > 0 ? 'red' : 'green'](screenPathsToRemoveLen)} ` +
        `${screensToRemove.type} reference images out of ${chalk.bold(allScreenPaths.length)}`
    );

    if (_.isEmpty(existentScreenPaths)) {
        return;
    }

    spinner.start(`Calculating total size of ${screensToRemove.type} reference images`);
    const bytes = (await Promise.map(existentScreenPaths, (screenPath) => fs.stat(screenPath))).reduce((acc, {size}) => acc + size, 0);
    spinner.succeed();

    logger.log(`Total size of ${screensToRemove.type} reference images = ${chalk.red(filesize(bytes))}`);

    const shouldShowList = await askQuestion({
        name: 'shouldShowList',
        type: 'confirm',
        message: `Show list of ${screensToRemove.type} reference images? (${screenPathsToRemoveLen} paths)`,
        default: false
    }, cliOpts);

    if (shouldShowList) {
        logger.log(`List of ${screensToRemove.type} reference images:\n${existentScreenPaths.map((p) => chalk.red(p)).join('\n')}`);
    }

    const shouldRemove = await askQuestion({
        name: 'shouldRemove',
        type: 'confirm',
        message: `Remove ${screensToRemove.type} reference images?`,
        default: true
    }, cliOpts);

    if (!shouldRemove) {
        return;
    }

    spinner.start(`Removing ${screensToRemove.type} reference images`);
    await removeScreens(existentScreenPaths);
    spinner.succeed();

    logger.log(`${chalk.green(screenPathsToRemoveLen)} reference images were removed`);
}

function collect(newValue, array = []) {
    return array.concat(newValue);
}

function getHelpMessage(toolName) {
    const rmUnusedScreens = `npx ${toolName} ${commandName}`;

    return `
  Example of usage:
    Specify the folder in which all reference screenshots are located:
    ${chalk.green(`${rmUnusedScreens} -p '${toolName}-screens-folder'`)}

    Specify the mask by which all reference screenshots will be found:
    ${chalk.green(`${rmUnusedScreens} -p 'screens/**/*.png'`)}

    Specify few masks by which all reference screenshots will be found:
    ${chalk.green(`${rmUnusedScreens} -p 'screens/**/chrome/*.png' -p 'screens/**/firefox/*.png'`)}

    Don't ask me about anything and just delete unused reference screenshots:
    ${chalk.green(`${rmUnusedScreens} -p '${toolName}-screens-folder' --skip-questions`)}`;
}

function transformPatternOption(patterns) {
    return patterns.map(p => {
        const resolvedPattern = path.resolve(process.cwd(), p);

        return resolvedPattern.endsWith('.png') ? resolvedPattern : path.join(resolvedPattern, '*.png');
    });
}
