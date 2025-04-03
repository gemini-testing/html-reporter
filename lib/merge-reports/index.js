'use strict';

const path = require('path');
const fs = require('fs-extra');
const axios = require('axios');
const _ = require('lodash');
const serverUtils = require('../server-utils');
const {isUrl} = require('../common-utils');
const dbServerUtils = require('../db-utils/server');
const {DB_FILE_EXTENSION, IMAGES_PATH, SNAPSHOTS_PATH, ERROR_DETAILS_PATH} = require('../constants');

module.exports = async (toolAdapter, srcPaths, {destPath, headers}) => {
    validateOpts({srcPaths, destPath, headers});

    let headersFromEnv;
    const {htmlReporter, reporterConfig} = toolAdapter;

    try {
        headersFromEnv = JSON.parse(process.env.html_reporter_headers || '{}');
    } catch (e) {
        throw new Error(`Couldn't parse headers from "html_reporter_headers" env variable: ${e.message}`);
    }

    const headersFromCli = headers.reduce((acc, header) => {
        const [key, ...values] = header.split('=');
        return _.set(acc, key, values.join('='));
    }, {});
    const parsedHeaders = {...headersFromCli, ...headersFromEnv};

    const resolvedUrls = await tryResolveUrls(srcPaths, parsedHeaders);
    const resolvedDbFiles = resolvedUrls.filter(serverUtils.isDbFile);

    const {true: remoteDbUrls = [], false: localDbPaths = []} = _.groupBy(resolvedDbFiles, isUrl);
    const dbPaths = localDbPaths.map((db, ind, arr) => {
        const dbName = arr.length > 1 ? genUniqDbName(db, ind + 1) : path.basename(db);
        return {src: path.resolve(process.cwd(), db), dest: path.resolve(destPath, dbName)};
    });

    const allDbPaths = [...remoteDbUrls, ...dbPaths.map(({dest}) => path.parse(dest).base)];
    const copyFilePromises = [];

    if (!_.isEmpty(localDbPaths)) {
        const srcReportPaths = _.uniq(localDbPaths.map(db => path.resolve(process.cwd(), path.parse(db).dir)));

        copyFilePromises.push(...[
            copyDbFiles(dbPaths),
            copyArtifacts({srcPaths: srcReportPaths, destPath, folderName: IMAGES_PATH}),
            copyArtifacts({srcPaths: srcReportPaths, destPath, folderName: SNAPSHOTS_PATH}),
            copyArtifacts({srcPaths: srcReportPaths, destPath, folderName: ERROR_DETAILS_PATH})
        ]);
    }

    await Promise.all([
        serverUtils.saveStaticFilesToReportDir(htmlReporter, reporterConfig, destPath),
        serverUtils.writeDatabaseUrlsFile(destPath, allDbPaths),
        ...copyFilePromises
    ]);

    await htmlReporter.emitAsync(htmlReporter.events.REPORT_SAVED, {reportPath: destPath});
};

function validateOpts({srcPaths, destPath, headers}) {
    if (!srcPaths.length) {
        throw new Error('Nothing to merge, no source reports are passed');
    }

    if (srcPaths.includes(destPath)) {
        throw new Error(`Destination report path: ${destPath}, exists in source report paths`);
    }

    for (const header of headers) {
        if (!header.includes('=')) {
            throw new Error(`Header must has key and value separated by "=" symbol, but got "${header}"`);
        }
    }
}

async function tryResolveUrls(urls, headers) {
    const resolvedUrls = [];
    const results = await Promise.all(urls.map(url => tryResolveUrl(url, headers)));

    results.forEach(({jsonUrls, dbUrls}) => {
        resolvedUrls.push(...jsonUrls.concat(dbUrls));
    });

    return resolvedUrls;
}

async function tryResolveUrl(url, headers) {
    const jsonUrls = [];
    const dbUrls = [];

    if (serverUtils.isDbFile(url)) {
        dbUrls.push(url);
    } else if (serverUtils.isJsonUrl(url)) {
        try {
            const data = isUrl(url)
                ? (await axios.get(url, {headers})).data
                : await fs.readJSON(url);

            const currentDbUrls = _.get(data, 'dbUrls', []);
            const currentJsonUrls = _.get(data, 'jsonUrls', []);

            const preparedDbUrls = dbServerUtils.prepareUrls(currentDbUrls, url);
            const preparedJsonUrls = dbServerUtils.prepareUrls(currentJsonUrls, url);

            const responses = await Promise.all(preparedJsonUrls.map(url => tryResolveUrl(url, headers)));

            dbUrls.push(...preparedDbUrls);

            responses.forEach(response => {
                dbUrls.push(...response.dbUrls);
                jsonUrls.push(...response.jsonUrls);
            });
        } catch (e) {
            jsonUrls.push(url);
        }
    }

    return {jsonUrls, dbUrls};
}

function genUniqDbName(dbPath, num) {
    return `${path.basename(dbPath, DB_FILE_EXTENSION)}_${num}${DB_FILE_EXTENSION}`;
}

async function copyDbFiles(dbPaths) {
    await Promise.all(dbPaths.map(({src, dest}) => fs.copy(src, dest)));
}

async function copyArtifacts({srcPaths, destPath, folderName}) {
    for (const reportPath of srcPaths) {
        const src = path.resolve(reportPath, folderName);
        const dest = path.resolve(destPath, folderName);

        const exists = await fs.pathExists(src);
        if (!exists) {
            continue;
        }

        await fs.copy(src, dest, {recursive: true, overwrite: false});
    }
}
