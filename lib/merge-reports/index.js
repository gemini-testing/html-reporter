'use strict';

const axios = require('axios');
const _ = require('lodash');
const serverUtils = require('../server-utils');
const dbServerUtils = require('../db-utils/server');

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

    await Promise.all([
        serverUtils.saveStaticFilesToReportDir(htmlReporter, reporterConfig, destPath),
        serverUtils.writeDatabaseUrlsFile(destPath, resolvedUrls)
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

    if (serverUtils.isDbUrl(url)) {
        dbUrls.push(url);
    } else if (serverUtils.isJsonUrl(url)) {
        try {
            const {data} = await axios.get(url, {headers});
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
