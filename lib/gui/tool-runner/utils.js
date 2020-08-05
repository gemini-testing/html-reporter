'use strict';

const _ = require('lodash');
const path = require('path');
const fs = require('fs-extra');
const chalk = require('chalk');
const crypto = require('crypto');
const Database = require('better-sqlite3');
const NestedError = require('nested-error-stacks');

const StaticTestsTreeBuilder = require('../../tests-tree-builder/static');
const {logger, logError} = require('../../server-utils');
const constantFileNames = require('../../constants/file-names');
const {findNode} = require('../../static/modules/utils');
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
        const testsTreeBuilder = StaticTestsTreeBuilder.create();

        const suitesRows = db.prepare(selectAllSuitesQuery()).raw().all().sort(compareDatabaseRowsByTimestamp);
        const {tree} = testsTreeBuilder.build(suitesRows, {convertToOldFormat: false});

        db.close();

        return tree;
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
