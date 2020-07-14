'use strict';

const _ = require('lodash');
const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk');
const crypto = require('crypto');
const Database = require('better-sqlite3');
const NestedError = require('nested-error-stacks');

const {logger, logError} = require('../../server-utils');
const constantFileNames = require('../../constants/file-names');
const {findNode, setStatusForBranch} = require('../../static/modules/utils');
const {formatTestAttempt} = require('../../../lib/static/modules/database-utils');
const {mergeTablesQueries, selectAllSuitesQuery, compareDatabaseRowsByTimestamp} = require('../../common-utils');
const {writeDatabaseUrlsFile} = require('../../server-utils');

const formatTestHandler = (browser, test) => {
    const {suitePath, name} = test;

    return {
        suite: {path: suitePath.slice(0, -1)},
        state: {name},
        browserId: browser.name
    };
};

exports.formatId = (hash, browserId) => `${hash}/${browserId}`;

exports.getShortMD5 = (str) => {
    return crypto.createHash('md5').update(str, 'ascii').digest('hex').substr(0, 7);
};

exports.mkFullTitle = ({suite, state}) => {
    // https://github.com/mochajs/mocha/blob/v2.4.5/lib/runnable.js#L165
    return `${suite.path.join(' ')} ${state.name}`;
};

exports.formatTests = (test) => {
    let resultFromBrowsers = [];
    let resultFromChildren = [];

    if (test.children) {
        resultFromChildren = _.flatMap(test.children, (child) => exports.formatTests(child));
    }

    if (test.browsers) {
        if (test.browserId) {
            test.browsers = _.filter(test.browsers, {name: test.browserId});
        }

        resultFromBrowsers = _.flatMap(test.browsers, (browser) => formatTestHandler(browser, test));
    }
    return [...resultFromBrowsers, ...resultFromChildren];
};

exports.findTestResult = (suites = [], test) => {
    const {name, suitePath, browserId} = test;
    const nodeResult = findNode(suites, suitePath);
    const browserResult = _.find(nodeResult.browsers, {name: browserId});

    return {name, suitePath, browserId, browserResult};
};

function parseDatabaseSuitesRows(rows) {
    const suitesArray = [];
    for (const row of rows) {
        const formattedRow = formatTestAttempt(row);
        const [suiteId, ...suitePath] = formattedRow.suitePath;
        const suite = _.find(suitesArray, {name: suiteId});

        if (!suite) {
            suitesArray.push({
                name: suiteId,
                suitePath: [suiteId]
            });
        }

        populateSuitesArray(formattedRow, _.find(suitesArray, {name: suiteId}), suitePath);
        setStatusForBranch(suitesArray, formattedRow.suitePath);
    }

    return {suites: suitesArray};
}

function populateSuitesArray(attempt, node, suitePath) {
    const pathPart = suitePath.shift();
    if (!pathPart) {
        node.browsers = Array.isArray(node.browsers) ? node.browsers : [];
        const browserResult = attempt.children[0].browsers[0];
        const browser = _.find(node.browsers, {name: browserResult.name});
        if (!browser) {
            browserResult.result.attempt = 0;
            node.browsers.push(browserResult);
            return;
        }

        const prevResult = browser.result;
        const currentResult = browserResult.result;
        browser.retries.push(prevResult);
        currentResult.attempt = prevResult.attempt + 1;
        browser.result = currentResult;
        return;
    }
    node.children = Array.isArray(node.children) ? node.children : [];
    let child = _.find(node.children, {name: pathPart});
    if (!child) {
        child = {
            name: pathPart,
            suitePath: node.suitePath.concat(pathPart)
        };
        node.children.push(child);
    }
    populateSuitesArray(attempt, child, suitePath);
}

// 'databaseUrls.json' may contain many databases urls but html-reporter at gui mode can work with single databases file.
// all databases should be local files.
exports.mergeDatabasesForReuse = async (reportPath) => {
    const dbUrlsJsonPath = path.resolve(reportPath, constantFileNames.DATABASE_URLS_JSON_NAME);
    const mergedDbPath = path.resolve(reportPath, constantFileNames.LOCAL_DATABASE_NAME);

    if (!await fs.pathExists(dbUrlsJsonPath)) {
        return;
    }

    const {dbUrls = []} = await fs.readJson(dbUrlsJsonPath);

    const dbPaths = dbUrls
        .filter(u => u !== constantFileNames.LOCAL_DATABASE_NAME)
        .map(u => path.resolve(reportPath, u));

    if (!dbPaths.length) {
        return;
    }

    logger.warn(chalk.yellow(`Merge databases to ${constantFileNames.LOCAL_DATABASE_NAME}`));

    const mergedDatabase = new Database(mergedDbPath);

    for (const query of mergeTablesQueries(dbPaths)) {
        try {
            mergedDatabase.prepare(query).run();
        } catch (err) {
            // TODO: To be able to work with files that have been created before
            // TODO: Remove in next versions
            if (/no such table/.test(err)) {
                console.warn(err);

                continue;
            }

            throw err;
        }
    }

    mergedDatabase.close();

    await writeDatabaseUrlsFile(reportPath, [constantFileNames.LOCAL_DATABASE_NAME]);
    await Promise.all(dbPaths.map(p => fs.remove(p)));
};

exports.getDataFromDatabase = (dbPath) => {
    try {
        const db = new Database(dbPath, {readonly: true, fileMustExist: true});
        const suitesRows = db.prepare(selectAllSuitesQuery()).raw().all();
        const suites = parseDatabaseSuitesRows(suitesRows.sort(compareDatabaseRowsByTimestamp));

        db.close();

        return suites;
    } catch (err) {
        throw new NestedError('Error while getting data from database ', err);
    }
};

exports.withErrorHandling = async (fn) => {
    try {
        await fn();
    } catch (err) {
        logError(err);
        process.exit(1);
    }
};
