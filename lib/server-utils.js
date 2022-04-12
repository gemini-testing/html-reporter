'use strict';

const path = require('path');
const url = require('url');
const chalk = require('chalk');
const _ = require('lodash');
const fs = require('fs-extra');

const {logger} = require('./common-utils');
const {ERROR, UPDATED, RUNNING, IDLE, SKIPPED} = require('./constants/test-statuses');
const {IMAGES_PATH} = require('./constants/paths');
const DATA_FILE_NAME = 'data.js';

const getReferencePath = (testResult, stateName) => createPath('ref', testResult, stateName);
const getCurrentPath = (testResult, stateName) => createPath('current', testResult, stateName);
const getDiffPath = (testResult, stateName) => createPath('diff', testResult, stateName);

const getReferenceAbsolutePath = (testResult, reportDir, stateName) => {
    const referenceImagePath = getReferencePath(testResult, stateName);

    return path.resolve(reportDir, referenceImagePath);
};

const getCurrentAbsolutePath = (testResult, reportDir, stateName) => {
    const currentImagePath = getCurrentPath(testResult, stateName);

    return path.resolve(reportDir, currentImagePath);
};

const getDiffAbsolutePath = (testResult, reportDir, stateName) => {
    const diffImagePath = getDiffPath(testResult, stateName);

    return path.resolve(reportDir, diffImagePath);
};

/**
 * @param {String} kind - одно из значений 'ref', 'current', 'diff'
 * @param {StateResult} result
 * @param {String} stateName - имя стэйта для теста
 * @returns {String}
 */
function createPath(kind, result, stateName) {
    const attempt = result.attempt || 0;
    const imageDir = _.compact([IMAGES_PATH, result.imageDir, stateName]);
    const components = imageDir.concat(`${result.browserId}~${kind}_${attempt}.png`);

    return path.join.apply(null, components);
}

function copyFileAsync(srcPath, destPath, reportDir = '') {
    const resolvedDestPath = path.resolve(reportDir, destPath);
    return makeDirFor(resolvedDestPath).then(() => fs.copy(srcPath, resolvedDestPath));
}

/**
 * @param {String} destPath
 */
function makeDirFor(destPath) {
    return fs.mkdirs(path.dirname(destPath));
}

function logPathToHtmlReport(pluginConfig) {
    const reportPath = `file://${path.resolve(pluginConfig.path, 'index.html')}`;

    logger.log(`Your HTML report is here: ${chalk.yellow(reportPath)}`);
    logger.log(`To open it use: ${chalk.yellow('npx hermione gui')} or ${chalk.yellow(`npx http-server ${pluginConfig.path}`)}`);
}

function logError(e) {
    logger.error(`Html-reporter runtime error: ${e.stack}`);
}

function hasImage(formattedResult) {
    return !!formattedResult.getImagesInfo(ERROR).length ||
        !!formattedResult.getCurrImg().path ||
        !!formattedResult.screenshot;
}

function prepareCommonJSData(data) {
    const stringifiedData = JSON.stringify(data, (key, val) => {
        return typeof val === 'function' ? val.toString() : val;
    });

    return [
        `var data = ${stringifiedData};`,
        'try { module.exports = data; } catch(e) {}'
    ].join('\n');
}

function shouldUpdateAttempt(status) {
    return ![SKIPPED, UPDATED, RUNNING, IDLE].includes(status);
}

function getDetailsFileName(testId, browserId, attempt) {
    return `${testId}-${browserId}_${Number(attempt) + 1}_${Date.now()}.json`;
}

async function saveStaticFilesToReportDir(hermione, pluginConfig, destPath) {
    const staticFolder = path.resolve(__dirname, './static');
    await fs.ensureDir(destPath);
    await Promise.all([
        fs.writeFile(
            path.resolve(destPath, DATA_FILE_NAME),
            prepareCommonJSData(getDataForStaticFile(hermione, pluginConfig)),
            'utf8'
        ),
        copyToReportDir(destPath, ['report.min.js', 'report.min.css'], staticFolder),
        fs.copy(path.resolve(staticFolder, 'index.html'), path.resolve(destPath, 'index.html')),
        fs.copy(path.resolve(staticFolder, 'icons'), path.resolve(destPath, 'icons')),
        // as soon as the pull request to sql.js will be accepted, we will switch to using the original package
        fs.copy(require.resolve('@gemini-testing/sql.js'), path.resolve(destPath, 'sql-wasm.js')),
        copyPlugins(pluginConfig, destPath)
    ]);
}

async function copyPlugins({plugins, pluginsEnabled}, destPath) {
    if (!pluginsEnabled || !plugins.length) {
        return;
    }

    try {
        const pluginsPath = path.resolve(destPath, 'plugins');
        await fs.ensureDir(pluginsPath);

        await Promise.all(mapPlugins(plugins, pluginName => copyPlugin(pluginName, pluginsPath)));
    } catch (e) {
        logError(e);
    }
}

async function copyPlugin(pluginName, pluginsPath) {
    const pluginPath = getPluginClientScriptPath(pluginName);
    if (!pluginPath) {
        return;
    }
    const destPluginPath = path.resolve(pluginsPath, pluginName, 'plugin.js');
    await fs.ensureDir(path.dirname(destPluginPath));
    await fs.copy(pluginPath, destPluginPath);
}

function urlPathNameEndsWith(currentUrl, searchString) {
    try {
        return url.parse(currentUrl).pathname.endsWith(searchString);
    } catch (e) {
        return false;
    }
}

async function writeDatabaseUrlsFile(destPath, srcPaths) {
    const jsonUrls = srcPaths.filter(p => urlPathNameEndsWith(p, '.json'));
    const dbUrls = srcPaths.filter(p => urlPathNameEndsWith(p, '.db'));

    const data = {
        dbUrls,
        jsonUrls
    };

    await fs.writeJson(path.resolve(destPath, 'databaseUrls.json'), data);
}

function copyToReportDir(destPath, files, sourceDirectory) {
    return Promise.all(files.map(fileName => {
        const from = path.resolve(sourceDirectory, fileName);
        const to = path.resolve(destPath, fileName);
        return fs.copy(from, to);
    }));
}

function getDataForStaticFile(hermione, pluginConfig) {
    return {
        skips: [],
        config: getConfigForStaticFile(pluginConfig),
        apiValues: hermione.htmlReporter.values,
        date: new Date().toString()
    };
}

function getConfigForStaticFile(pluginConfig) {
    return _.pick(
        pluginConfig,
        [
            'defaultView',
            'diffMode',
            'baseHost',
            'errorPatterns',
            'metaInfoBaseUrls',
            'customScripts',
            'yandexMetrika',
            'pluginsEnabled',
            'plugins'
        ]
    );
}

async function initializeCustomGui(hermione, {customGui}) {
    await Promise.all(
        _(customGui)
            .flatMap()
            .filter(({initialize}) => _.isFunction(initialize))
            .map((ctx) => ctx.initialize({hermione, ctx}))
            .value()
    );
}

async function runCustomGuiAction(hermione, {customGui}, payload) {
    const {sectionName, groupIndex, controlIndex} = payload;
    const ctx = customGui[sectionName][groupIndex];
    const control = ctx.controls[controlIndex];

    await ctx.action({hermione, control, ctx});
}

function getPluginClientScriptPath(pluginName) {
    try {
        return require.resolve(`${pluginName}/plugin.js`);
    } catch (e) {
        logError(e);
        return null;
    }
}

function getPluginMiddleware(pluginName) {
    try {
        return require(`${pluginName}/middleware.js`);
    } catch (e) {
        if (e.code !== 'MODULE_NOT_FOUND') {
            logError(e);
        }
        return null;
    }
}

function isUnexpectedPlugin(plugins, pluginName) {
    for (const {name} of plugins) {
        if (name === pluginName) {
            return false;
        }
    }
    return true;
}

function forEachPlugin(plugins, callback) {
    const seen = new Set();
    for (const plugin of plugins) {
        if (!seen.has(plugin.name)) {
            seen.add(plugin.name);
            callback(plugin.name);
        }
    }
}

function mapPlugins(plugins, callback) {
    const result = [];
    forEachPlugin(plugins, pluginName => result.push(callback(pluginName)));
    return result;
}

module.exports = {
    getDetailsFileName,

    getReferencePath,
    getCurrentPath,
    getDiffPath,
    hasImage,

    getReferenceAbsolutePath,
    getCurrentAbsolutePath,
    getDiffAbsolutePath,

    copyFileAsync,
    makeDirFor,

    logPathToHtmlReport,
    logError,

    require,
    prepareCommonJSData,
    shouldUpdateAttempt,
    saveStaticFilesToReportDir,
    copyToReportDir,
    writeDatabaseUrlsFile,
    getConfigForStaticFile,

    getPluginClientScriptPath,
    getPluginMiddleware,
    isUnexpectedPlugin,
    forEachPlugin,
    mapPlugins,

    initializeCustomGui,
    runCustomGuiAction
};
