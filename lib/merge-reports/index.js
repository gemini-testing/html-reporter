'use strict';

const axios = require('axios');
const _ = require('lodash');
const serverUtils = require('../server-utils');

module.exports = async (pluginConfig, hermione, srcPaths, {destination: destPath}) => {
    validateOpts(srcPaths, destPath);

    const resolvedUrls = await tryResolveUrls(srcPaths);

    await Promise.all([
        serverUtils.saveStaticFilesToReportDir(hermione.htmlReporter, pluginConfig, destPath),
        serverUtils.writeDatabaseUrlsFile(destPath, resolvedUrls)
    ]);

    await hermione.htmlReporter.emitAsync(hermione.htmlReporter.events.REPORT_SAVED, {reportPath: destPath});
};

function validateOpts(srcPaths, destPath) {
    if (!srcPaths.length) {
        throw new Error('Nothing to merge, no source reports are passed');
    }

    if (srcPaths.includes(destPath)) {
        throw new Error(`Destination report path: ${destPath}, exists in source report paths`);
    }
}

async function tryResolveUrls(urls) {
    const resolvedUrls = [];
    const results = await Promise.all(urls.map(tryResolveUrl));

    results.forEach(({jsonUrls, dbUrls}) => {
        resolvedUrls.push(...jsonUrls.concat(dbUrls));
    });

    return resolvedUrls;
}

async function tryResolveUrl(url) {
    const jsonUrls = [];
    const dbUrls = [];

    if (serverUtils.isDbUrl(url)) {
        dbUrls.push(url);
    } else if (serverUtils.isJsonUrl(url)) {
        try {
            const {data} = await axios.get(url);
            const currentDbUrls = _.get(data, 'dbUrls', []);
            const currentJsonUrls = _.get(data, 'jsonUrls', []);

            const responses = await Promise.all(currentJsonUrls.map(tryResolveUrl));

            dbUrls.push(...currentDbUrls);

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
