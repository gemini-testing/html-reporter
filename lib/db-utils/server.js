'use strict';

const path = require('path');
const crypto = require('crypto');
const axios = require('axios');
const fs = require('fs-extra');
const Database = require('better-sqlite3');
const chalk = require('chalk');
const NestedError = require('nested-error-stacks');

const StaticTestsTreeBuilder = require('../tests-tree-builder/static');
const commonSqliteUtils = require('./common');
const {isUrl, fetchFile, normalizeUrls, logger} = require('../common-utils');

const {DATABASE_URLS_JSON_NAME, LOCAL_DATABASE_NAME} = require('../constants/database');

function downloadDatabases(dbJsonUrls, opts) {
    const loadDbJsonUrl = async (dbJsonUrl) => {
        if (isUrl(dbJsonUrl)) {
            return fetchFile(dbJsonUrl);
        }

        const data = await fs.readJSON(dbJsonUrl);
        return {data};
    };

    const prepareUrls = (urls, baseUrl) => isUrl(baseUrl) ? normalizeUrls(urls, baseUrl) : urls;
    const loadDbUrl = (dbUrl, opts) => downloadSingleDatabase(dbUrl, opts);

    return commonSqliteUtils.handleDatabases(dbJsonUrls, {...opts, loadDbJsonUrl, prepareUrls, loadDbUrl});
}

async function mergeDatabases(srcDbPaths, reportPath) {
    try {
        const mainDatabaseUrls = path.resolve(reportPath, DATABASE_URLS_JSON_NAME);
        const mergedDbPath = path.resolve(reportPath, LOCAL_DATABASE_NAME);
        const mergedDb = new Database(mergedDbPath);

        commonSqliteUtils.mergeTables({db: mergedDb, dbPaths: srcDbPaths, getExistingTables: (statement) => {
            return statement.all().map((table) => table.name);
        }});

        for (const dbPath of srcDbPaths) {
            await fs.remove(dbPath);
        }

        await rewriteDatabaseUrls([mergedDbPath], mainDatabaseUrls, reportPath);

        mergedDb.close();
    } catch (err) {
        throw new NestedError('Error while merging databases', err);
    }
}

function getTestsTreeFromDatabase(dbPath) {
    try {
        const db = new Database(dbPath, {readonly: true, fileMustExist: true});
        const testsTreeBuilder = StaticTestsTreeBuilder.create();

        const suitesRows = db.prepare(commonSqliteUtils.selectAllSuitesQuery())
            .raw()
            .all()
            .sort(commonSqliteUtils.compareDatabaseRowsByTimestamp);
        const {tree} = testsTreeBuilder.build(suitesRows);

        db.close();

        return tree;
    } catch (err) {
        throw new NestedError('Error while getting data from database', err);
    }
}

async function downloadSingleDatabase(dbUrl, {pluginConfig} = {}) {
    if (!isUrl(dbUrl)) {
        return path.resolve(pluginConfig.path, dbUrl);
    }

    const dest = path.resolve(pluginConfig.path, getUniqueFileNameForLink(dbUrl));

    logger.log(chalk.green(`Download ${dbUrl} to ${pluginConfig.path}`));

    const response = await axios({
        url: dbUrl,
        responseType: 'stream'
    });

    const writer = fs.createWriteStream(dest);

    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });

    return dest;
}

function getUniqueFileNameForLink(link) {
    const fileName = crypto
        .createHash('sha256')
        .update(link)
        .digest('hex');
    const fileExt = path.extname(new URL(link).pathname);

    return `${fileName}${fileExt}`;
}

async function rewriteDatabaseUrls(dbPaths, mainDatabaseUrls, reportPath) {
    const dbUrls = dbPaths.map(p => path.relative(reportPath, p));

    await fs.writeJson(mainDatabaseUrls, {
        dbUrls,
        jsonUrls: []
    });
}

module.exports = {
    ...commonSqliteUtils,
    downloadDatabases,
    mergeDatabases,
    getTestsTreeFromDatabase
};
