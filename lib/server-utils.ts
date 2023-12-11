import path from 'path';
import url from 'url';
import chalk from 'chalk';
import _ from 'lodash';
import fs from 'fs-extra';
import {logger} from './common-utils';
import {UPDATED, RUNNING, IDLE, SKIPPED, IMAGES_PATH, TestStatus} from './constants';
import type {HtmlReporter} from './plugin-api';
import type {ReporterTestResult} from './test-adapter';
import {CustomGuiItem, HermioneTestResult, ReporterConfig} from './types';
import type Hermione from 'hermione';
import crypto from 'crypto';
import {ImageHandler, ImagesInfoFormatter} from './image-handler';
import {HermioneTestAdapter} from './test-adapter';
import {Router} from 'express';

const DATA_FILE_NAME = 'data.js';

interface GetPathOptions {
    stateName?: string;
    imageDir: string;
    attempt: number;
    browserId: string;
}

export const getReferencePath = (options: GetPathOptions): string => createPath({kind: 'ref', ...options});
export const getCurrentPath = (options: GetPathOptions): string => createPath({kind: 'current', ...options});
export const getDiffPath = (options: GetPathOptions): string => createPath({kind: 'diff', ...options});

export const getReferenceAbsolutePath = (testResult: ReporterTestResult, reportDir: string, stateName: string): string => {
    const referenceImagePath = getReferencePath({attempt: testResult.attempt, imageDir: testResult.imageDir, browserId: testResult.browserId, stateName});

    return path.resolve(reportDir, referenceImagePath);
};

export const getCurrentAbsolutePath = (testResult: ReporterTestResult, reportDir: string, stateName: string): string => {
    const currentImagePath = getCurrentPath({attempt: testResult.attempt, imageDir: testResult.imageDir, browserId: testResult.browserId, stateName});

    return path.resolve(reportDir, currentImagePath);
};

export const getDiffAbsolutePath = (testResult: ReporterTestResult, reportDir: string, stateName: string): string => {
    const diffImagePath = getDiffPath({attempt: testResult.attempt, imageDir: testResult.imageDir, browserId: testResult.browserId, stateName});

    return path.resolve(reportDir, diffImagePath);
};

interface CreatePathOptions extends GetPathOptions {
    kind: string;
}

export function createPath({attempt: attemptInput, imageDir: imageDirInput, browserId, kind, stateName}: CreatePathOptions): string {
    const attempt: number = attemptInput || 0;
    const imageDir = _.compact([IMAGES_PATH, imageDirInput, stateName]);
    const components = imageDir.concat(`${browserId}~${kind}_${attempt}.png`);

    return path.join(...components);
}

export function createHash(buffer: Buffer): string {
    return crypto
        .createHash('sha1')
        .update(buffer)
        .digest('base64');
}

export interface CopyFileAsyncOptions {
    reportDir: string;
    overwrite: boolean
}

export function copyFileAsync(srcPath: string, destPath: string, {reportDir = '', overwrite = true}: Partial<CopyFileAsyncOptions> = {}): Promise<void> {
    const resolvedDestPath = path.resolve(reportDir, destPath);
    return makeDirFor(resolvedDestPath).then(() => fs.copy(srcPath, resolvedDestPath, {overwrite}));
}

export function deleteFile(filePath: string): Promise<void> {
    return fs.remove(filePath);
}

export function makeDirFor(destPath: string): Promise<void> {
    return fs.mkdirs(path.dirname(destPath));
}

export function fileExists(path: string): boolean {
    return fs.existsSync(path);
}

export function logPathToHtmlReport(pluginConfig: ReporterConfig): void {
    const reportPath = `file://${path.resolve(pluginConfig.path, 'index.html')}`;

    logger.log(`Your HTML report is here: ${chalk.yellow(reportPath)}`);
    logger.log(`To open it use: ${chalk.yellow('npx hermione gui')} or ${chalk.yellow(`npx http-server ${pluginConfig.path}`)}`);
}

export function logError(e: Error): void {
    logger.error(`Html-reporter runtime error: ${e.stack}`);
}

export function hasImage(formattedResult: ReporterTestResult): boolean {
    return !!formattedResult.imagesInfo?.length ||
        !!ImageHandler.getCurrImg(formattedResult.assertViewResults)?.path ||
        !!formattedResult.screenshot;
}

export function prepareCommonJSData(data: unknown): string {
    const stringifiedData = JSON.stringify(data, (_key, val) => {
        return typeof val === 'function' ? val.toString() : val;
    });

    return [
        `var data = ${stringifiedData};`,
        'try { module.exports = data; } catch(e) {}'
    ].join('\n');
}

export function shouldUpdateAttempt(status: TestStatus): boolean {
    return ![SKIPPED, UPDATED, RUNNING, IDLE].includes(status);
}

export function getDetailsFileName(testId: string, browserId: string, attempt: number): string {
    return `${testId}-${browserId}_${Number(attempt) + 1}_${Date.now()}.json`;
}

export async function saveStaticFilesToReportDir(htmlReporter: HtmlReporter, pluginConfig: ReporterConfig, destPath: string): Promise<void> {
    const staticFolder = path.resolve(__dirname, './static');
    await fs.ensureDir(destPath);
    await Promise.all([
        fs.writeFile(
            path.resolve(destPath, DATA_FILE_NAME),
            prepareCommonJSData(getDataForStaticFile(htmlReporter, pluginConfig)),
            'utf8'
        ),
        copyToReportDir(destPath, ['report.min.js', 'report.min.css'], staticFolder),
        fs.copy(path.resolve(staticFolder, 'index.html'), path.resolve(destPath, 'index.html')),
        fs.copy(path.resolve(staticFolder, 'icons'), path.resolve(destPath, 'icons')),
        fs.copy(require.resolve('@gemini-testing/sql.js/dist/sql-wasm.js'), path.resolve(destPath, 'sql-wasm.js')),
        fs.copy(require.resolve('@gemini-testing/sql.js/dist/sql-wasm.wasm'), path.resolve(destPath, 'sql-wasm.wasm')),
        copyPlugins(pluginConfig, destPath)
    ]);
}

export async function copyPlugins({plugins, pluginsEnabled}: ReporterConfig, destPath: string): Promise<void> {
    if (!pluginsEnabled || !plugins?.length) {
        return;
    }

    try {
        const pluginsPath = path.resolve(destPath, 'plugins');
        await fs.ensureDir(pluginsPath);
        await Promise.all(mapPlugins(plugins, pluginName => copyPlugin(pluginName, pluginsPath)));
    } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
        logError(e);
    }
}

export async function copyPlugin(pluginName: string, pluginsPath: string): Promise<void> {
    const pluginPath = getPluginClientScriptPath(pluginName);
    if (!pluginPath) {
        return;
    }
    const destPluginPath = path.resolve(pluginsPath, pluginName, 'plugin.js');
    await fs.ensureDir(path.dirname(destPluginPath));
    await fs.copy(pluginPath, destPluginPath);
}

export function urlPathNameEndsWith(currentUrl: string, searchString: string): boolean {
    try {
        return url.parse(currentUrl).pathname?.endsWith(searchString) || false;
    } catch (e) {
        return false;
    }
}

export function isJsonUrl(url: string): boolean {
    return urlPathNameEndsWith(url, '.json');
}

export function isDbUrl(url: string): boolean {
    return urlPathNameEndsWith(url, '.db');
}

export async function writeDatabaseUrlsFile(destPath: string, srcPaths: string[]): Promise<void> {
    const jsonUrls = srcPaths.filter(isJsonUrl);
    const dbUrls = srcPaths.filter(isDbUrl);
    const data = {
        dbUrls,
        jsonUrls
    };

    await fs.writeJson(path.resolve(destPath, 'databaseUrls.json'), data);
}

export function copyToReportDir(destPath: string, files: string[], sourceDirectory: string): Promise<void[]> {
    return Promise.all(files.map(fileName => {
        const from = path.resolve(sourceDirectory, fileName);
        const to = path.resolve(destPath, fileName);
        return fs.copy(from, to);
    }));
}

export type ConfigForStaticFile = Pick<ReporterConfig, 'defaultView' |
    'diffMode' |
    'baseHost' |
    'errorPatterns' |
    'metaInfoBaseUrls' |
    'customScripts' |
    'yandexMetrika' |
    'pluginsEnabled' |
    'plugins'>;

export function getConfigForStaticFile(pluginConfig: ReporterConfig): ConfigForStaticFile {
    return _.pick(pluginConfig, [
        'defaultView',
        'diffMode',
        'baseHost',
        'errorPatterns',
        'metaInfoBaseUrls',
        'customScripts',
        'yandexMetrika',
        'pluginsEnabled',
        'plugins'
    ]);
}

export interface DataForStaticFile {
    skips: object[];
    config: ConfigForStaticFile;
    apiValues: HtmlReporter['values'];
    date: string;
}

export function getDataForStaticFile(htmlReporter: HtmlReporter, pluginConfig: ReporterConfig): DataForStaticFile {
    return {
        skips: [],
        config: getConfigForStaticFile(pluginConfig),
        apiValues: htmlReporter.values,
        date: new Date().toString()
    };
}

export async function initializeCustomGui(hermione: Hermione, {customGui}: ReporterConfig): Promise<void> {
    await Promise.all(
        _(customGui)
            .flatMap<CustomGuiItem>(_.identity)
            .map((ctx) => ctx.initialize?.({hermione, ctx}))
            .value()
    );
}

export interface CustomGuiActionPayload {
    sectionName: string;
    groupIndex: number;
    controlIndex: number;
}

export async function runCustomGuiAction(hermione: Hermione, {customGui}: ReporterConfig, payload: CustomGuiActionPayload): Promise<void> {
    const {sectionName, groupIndex, controlIndex} = payload;
    const ctx = customGui[sectionName][groupIndex];
    const control = ctx.controls[controlIndex];

    await ctx.action({hermione, control, ctx});
}

export function getPluginClientScriptPath(pluginName: string): string | null {
    try {
        return require.resolve(`${pluginName}/plugin.js`);
    } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
        logError(e);
        return null;
    }
}

interface PluginMiddleware {
    (pluginRouter: Router): unknown;
}

export function getPluginMiddleware(pluginName: string): PluginMiddleware | null {
    try {
        return require(`${pluginName}/middleware.js`);
    } catch (e: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
        if (e.code !== 'MODULE_NOT_FOUND') {
            logError(e);
        }
        return null;
    }
}

export function isUnexpectedPlugin(plugins: ReporterConfig['plugins'], pluginName: string): boolean {
    for (const {name} of plugins) {
        if (name === pluginName) {
            return false;
        }
    }
    return true;
}

export function forEachPlugin(plugins: ReporterConfig['plugins'], callback: (name: string) => void): void {
    const seen = new Set();
    for (const plugin of plugins) {
        if (!seen.has(plugin.name)) {
            seen.add(plugin.name);
            callback(plugin.name);
        }
    }
}

export function mapPlugins<T>(plugins: ReporterConfig['plugins'], callback: (name: string) => T): T[] {
    const result: T[] = [];
    forEachPlugin(plugins, pluginName => result.push(callback(pluginName)));
    return result;
}

export const formatTestResult = (
    rawResult: HermioneTestResult,
    status: TestStatus,
    attempt: number,
    {imageHandler}: {imageHandler: ImagesInfoFormatter}
): ReporterTestResult => {
    return new HermioneTestAdapter(rawResult, {attempt, status, imagesInfoFormatter: imageHandler});
};

export const saveErrorDetails = async (testResult: ReporterTestResult, reportPath: string): Promise<void> => {
    if (!testResult.errorDetails) {
        return;
    }

    const detailsFilePath = path.resolve(reportPath, testResult.errorDetails.filePath);
    const detailsData = _.isObject(testResult.errorDetails.data)
        ? JSON.stringify(testResult.errorDetails.data, null, 2)
        : testResult.errorDetails.data;

    await makeDirFor(detailsFilePath);
    await fs.writeFile(detailsFilePath, detailsData);
};
