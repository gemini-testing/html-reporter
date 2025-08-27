import _ from 'lodash';
import * as url from 'url';
import * as path from 'path';
import type {Stats} from 'fs';
import fs from 'fs-extra';

import * as serverUtils from '../server-utils';
import {isUrl, logger} from '../common-utils';
import * as dbServerUtils from '../db-utils/server';
import {DB_FILE_EXTENSION, IMAGES_PATH, SNAPSHOTS_PATH, ERROR_DETAILS_PATH, DATABASE_URLS_JSON_NAME, LOCAL_DATABASE_NAME} from '../constants';
import {ToolAdapter} from '../adapters/tool';

interface MergeOptions {
    destPath: string;
    headers: string[];
}

interface DbPath {
    src: string;
    dest: string;
}

export const mergeReports = async (toolAdapter: ToolAdapter, srcPaths: string[], {destPath, headers}: MergeOptions): Promise<void> => {
    await validateOpts({srcPaths, destPath, headers});

    let headersFromEnv: Record<string, string>;
    const {htmlReporter, reporterConfig} = toolAdapter;

    try {
        headersFromEnv = JSON.parse(process.env.html_reporter_headers || '{}');
    } catch (e: unknown) {
        const error = e as Error;
        throw new Error(`Couldn't parse headers from "html_reporter_headers" env variable: ${error.message}`);
    }

    const headersFromCli = headers.reduce((acc: Record<string, string>, header: string) => {
        const [key, ...values] = header.split('=');
        return _.set(acc, key, values.join('='));
    }, {});
    const parsedHeaders = {...headersFromCli, ...headersFromEnv};

    const resolvedUrls = await tryResolveUrls(srcPaths, parsedHeaders);
    const resolvedDbFiles = resolvedUrls.filter(serverUtils.isDbFile);

    const {true: remoteDbUrls = [], false: localDbPaths = []} = _.groupBy(resolvedDbFiles, isUrl);
    const dbPaths: DbPath[] = localDbPaths.map((db: string, ind: number, arr: string[]) => {
        const dbName = arr.length > 1 ? genUniqDbName(db, ind + 1) : path.basename(db);
        return {src: path.resolve(process.cwd(), db), dest: path.resolve(destPath, dbName)};
    });

    const allDbPaths = [...remoteDbUrls, ...dbPaths.map(({dest}) => path.parse(dest).base)];
    const copyFilePromises: Promise<void>[] = [];

    await fs.ensureDir(destPath);

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

interface ValidateOptsParams {
    srcPaths: string[];
    destPath: string;
    headers: string[];
}

async function validateOpts({srcPaths, destPath, headers}: ValidateOptsParams): Promise<void> {
    if (!srcPaths.length) {
        throw new Error('Nothing to merge, no source reports are passed');
    }

    if (srcPaths.length === 1) {
        console.warn(`Only one source report is passed: ${srcPaths[0]}, which is usually not what you want. Now, a copy of source report will just be created.`);
    }

    if (srcPaths.includes(destPath)) {
        throw new Error(`Destination report path: ${destPath}, exists in source report paths`);
    }

    for (const srcPath of srcPaths) {
        if (isUrl(srcPath)) {
            continue;
        }

        let srcPathStat: Stats;

        try {
            srcPathStat = await fs.stat(srcPath);
        } catch (err: unknown) {
            const error = err as NodeJS.ErrnoException;
            if (error.code !== 'ENOENT') {
                throw err;
            } else {
                throw new Error(`Specified source path: ${srcPath} doesn't exists on file system`);
            }
        }

        if (srcPathStat.isDirectory()) {
            const dbUrlsJsonPath = path.join(srcPath, DATABASE_URLS_JSON_NAME);
            const isDbUrlsJsonPathExists = await fs.pathExists(dbUrlsJsonPath);

            if (!isDbUrlsJsonPathExists) {
                throw new Error(`${DATABASE_URLS_JSON_NAME} doesn't exist in specified source path: ${srcPath}`);
            }
        } else {
            if (!srcPath.endsWith(DATABASE_URLS_JSON_NAME) && !srcPath.endsWith(LOCAL_DATABASE_NAME)) {
                throw new Error(`Specified source path: ${srcPath} must be a directory or one of the following files: ${DATABASE_URLS_JSON_NAME}, ${LOCAL_DATABASE_NAME}.`);
            }
        }
    }

    for (const header of headers) {
        if (!header.includes('=')) {
            throw new Error(`Header must has key and value separated by "=" symbol, but got "${header}"`);
        }
    }
}

async function tryResolveUrls(urls: string[], headers: Record<string, string>): Promise<string[]> {
    const resolvedUrls: string[] = [];
    const results = await Promise.all(urls.map(async (u: string) => {
        const extName = path.extname(isUrl(u) ? url.parse(u).pathname || '' : u);

        if (!extName) {
            u = isUrl(u) ? new URL(DATABASE_URLS_JSON_NAME, u).href : path.join(u, DATABASE_URLS_JSON_NAME);
        }

        return tryResolveUrl(u, headers);
    }));

    results.forEach(({jsonUrls, dbUrls}) => {
        resolvedUrls.push(...jsonUrls.concat(dbUrls));
    });

    return resolvedUrls;
}

interface ResolveUrlResult {
    jsonUrls: string[];
    dbUrls: string[];
}

async function tryResolveUrl(url: string, headers: Record<string, string>): Promise<ResolveUrlResult> {
    const jsonUrls: string[] = [];
    const dbUrls: string[] = [];

    if (serverUtils.isDbFile(url)) {
        dbUrls.push(url);
    } else if (serverUtils.isJsonUrl(url)) {
        try {
            const {default: axios} = await import('axios');
            const data = isUrl(url)
                ? (await axios.get(url, {headers})).data
                : await fs.readJSON(url);

            const currentDbUrls = _.get(data, 'dbUrls', []);
            const currentJsonUrls = _.get(data, 'jsonUrls', []);

            const preparedDbUrls = dbServerUtils.prepareUrls(currentDbUrls, url);
            const preparedJsonUrls = dbServerUtils.prepareUrls(currentJsonUrls, url);

            const responses = await Promise.all(preparedJsonUrls.map((url: string) => tryResolveUrl(url, headers)));

            dbUrls.push(...preparedDbUrls);

            responses.forEach(response => {
                dbUrls.push(...response.dbUrls);
                jsonUrls.push(...response.jsonUrls);
            });
        } catch (e: unknown) {
            const error = e as Error;
            logger.warn(`Failed to handle ${url}: ${error.message}`);
            jsonUrls.push(url);
        }
    }

    return {jsonUrls, dbUrls};
}

function genUniqDbName(dbPath: string, num: number): string {
    return `${path.basename(dbPath, DB_FILE_EXTENSION)}_${num}${DB_FILE_EXTENSION}`;
}

async function copyDbFiles(dbPaths: DbPath[]): Promise<void> {
    await Promise.all(dbPaths.map(({src, dest}: DbPath) => fs.copy(src, dest)));
}

interface CopyArtifactsParams {
    srcPaths: string[];
    destPath: string;
    folderName: string;
}

async function copyArtifacts({srcPaths, destPath, folderName}: CopyArtifactsParams): Promise<void> {
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
