'use strict';

const fs = require('fs');
const _ = require('lodash');
const path = require('path');
const chalk = require('chalk');
const crypto = require('crypto');
const sqlite3 = require('sqlite3');

const utils = require('../../server-utils');
const constantPaths = require('../../constants/paths');
const {findNode, setStatusForBranch} = require('../../static/modules/utils');
const {formatTestAttempt} = require('../../../lib/static/modules/database-utils');

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

function parseDatabaseRows(rows, reportBuilder) {
    const suitesArray = [];
    for (const row of rows) {
        const rowAsArray = Object.values(row);
        reportBuilder.saveReusedTestResult(rowAsArray);
        const formattedRow = formatTestAttempt(rowAsArray);
        const suiteId = formattedRow.suitePath[0];
        const suite = _.find(suitesArray, {name: suiteId});
        if (!suite) {
            suitesArray.push({
                name: suiteId,
                suitePath: [suiteId]
            });
        }

        // eslint-disable-next-line no-unused-vars
        const [__, ...suitePath] = formattedRow.suitePath;
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
        browser.retries.push(browser.result);
        browserResult.result.attempt = browser.result.attempt + 1; //set the attempt number 1 more than the previous one
        browser.result = browserResult.result; //set the result to the latest attempt
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

exports.renameDatabaseForReuse = (reportPath) => {
    try {
        fs.renameSync(
            path.resolve(reportPath, constantPaths.LOCAL_DATABASE_NAME),
            path.resolve(reportPath, constantPaths.DATABASE_TO_REUSE)
        );
    } catch (e) {
        utils.logger.warn(chalk.yellow(`No database to reuse in ${reportPath}`));
    }
};

exports.getDataFromDatabase = async (reportPath, reportBuilder) => {
    const database = await new sqlite3.Database(path.resolve(reportPath, constantPaths.DATABASE_TO_REUSE));
    return new Promise((resolve) => {
        database.all('SELECT * FROM suites', [], (err, rows) => {
            if (err) {
                throw err;
            }
            database.close();
            resolve(parseDatabaseRows(rows, reportBuilder));
        });
    });
};
