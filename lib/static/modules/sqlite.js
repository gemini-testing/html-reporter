'use strict';

import axios from 'axios';
import {flattenDeep} from 'lodash';
import {mergeTablesQueries} from '../../common-utils';

function isRelativeUrl(url) {
    try {
        // eslint-disable-next-line no-new
        new URL(url);

        return false;
    } catch (e) {
        return true;
    }
}

function normalizeUrls(urls = [], baseUrl) {
    const baseUrlsSearch = new URL(baseUrl).search;

    return urls.map(url => {
        try {
            const newUrl = new URL(url, baseUrl);

            // URL's parameters can specify directory at file server
            if (isRelativeUrl(url) && !newUrl.search) {
                newUrl.search = baseUrlsSearch;
            }

            return newUrl.href;
        } catch (e) {
            console.warn(`Can not normalize url '${url} for base url '${baseUrl}'`, e);

            return url;
        }
    });
}

async function fetchFile(url, options) {
    try {
        const {data, status} = await axios.get(url, options);

        return {data, status};
    } catch (e) {
        console.warn(`Error while fetching ${url}`, e);

        // 'unknown' for request blocked by CORS policy
        const status = e.response ? e.response.status : 'unknown';

        return {data: null, status};
    }
}

// recursive fetch databaseUrls.json and databases
async function fetchDatabases(currentJsonsUrls) {
    return flattenDeep(
        await Promise.all(
            currentJsonsUrls.map(async currentJsonUrl => {
                try {
                    const currentJsonResponse = await fetchFile(currentJsonUrl);

                    if (!currentJsonResponse.data) {
                        return {
                            url: currentJsonUrl,
                            status: currentJsonResponse.status,
                            data: null
                        };
                    }

                    // JSON format declare at lib/static/modules/actions.js
                    const {dbUrls, jsonUrls} = currentJsonResponse.data;

                    // paths from databaseUrls.json may be relative or absolute
                    const normalizedDbUrls = normalizeUrls(dbUrls, currentJsonUrl);
                    const normalizedJsonUrls = normalizeUrls(jsonUrls, currentJsonUrl);

                    return await Promise.all([
                        fetchDatabases(normalizedJsonUrls),

                        ...normalizedDbUrls.map(async databaseUrl => {
                            const {data, status} = await fetchFile(databaseUrl, {
                                responseType: 'arraybuffer'
                            });

                            return {url: databaseUrl, status, data};
                        })
                    ]);
                } catch (e) {
                    console.warn(`Error while fetching databases from ${currentJsonUrl}`, e);

                    return {url: currentJsonUrl, status: 'unknown', data: null};
                }
            }),
        ),
    );
}

async function mergeDatabases(dataForDbs) {
    const SQL = await window.initSqlJs();

    const fetchedDataArray = dataForDbs.map(data => new Uint8Array(data));
    const connections = fetchedDataArray.map(data => new SQL.Database(data));

    if (connections.length === 0) {
        return null;
    } else if (connections.length === 1) {
        return connections[0];
    }

    const sumOfChunkSizes = fetchedDataArray.reduce((acc, data) => {
        return acc + data.length;
    }, 0);

    const mergedDbConnection = new SQL.Database(undefined, sumOfChunkSizes);
    const dbPaths = connections.map(db => db.filename);

    for (const query of mergeTablesQueries(dbPaths)) {
        mergedDbConnection.run(query);
    }

    connections.forEach(db => db.close());

    return mergedDbConnection;
}

module.exports = {
    fetchDatabases,
    mergeDatabases
};
