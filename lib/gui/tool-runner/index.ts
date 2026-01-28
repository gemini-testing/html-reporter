import path from 'node:path';
import os from 'node:os';

import {CommanderStatic} from '@gemini-testing/commander';
import chalk from 'chalk';
import fs from 'fs-extra';
import _ from 'lodash';
import looksSame, {CoordBounds} from 'looks-same';
import PQueue from 'p-queue';
import type {Response} from 'express';

import {GuiReportBuilder, GuiReportBuilderResult} from '../../report-builder/gui';
import {EventSource} from '../event-source';
import {SqliteClient} from '../../sqlite-client';
import {Cache} from '../../cache';
import {ImagesInfoSaver} from '../../images-info-saver';
import {SqliteImageStore} from '../../image-store';
import * as reporterHelper from '../../reporter-helpers';
import {logger, getShortMD5} from '../../common-utils';
import {formatId, mkFullTitle, mergeDatabasesForReuse, filterByEqualDiffSizes, prepareLocalDatabase, getAssertViewResults} from './utils';
import {getExpectedCacheKey, getTimeTravelModeEnumSafe} from '../../server-utils';
import {getTestsTreeFromDatabase} from '../../db-utils/server';
import {
    UPDATED,
    SKIPPED,
    IDLE,
    ToolName,
    DATABASE_URLS_JSON_NAME,
    LOCAL_DATABASE_NAME,
    PluginEvents,
    UNKNOWN_ATTEMPT, BrowserFeature, Feature, TimeTravelFeature
} from '../../constants';

import {ToolAdapter} from '../../adapters/tool';
import type {GuiCliOptions, ServerArgs} from '../index';
import type {TestBranch, TestEqualDiffsData, TestRefUpdateData} from '../../tests-tree-builder/gui';
import type {ReporterTestResult} from '../../adapters/test-result';
import type {Tree, TreeImage} from '../../tests-tree-builder/base';
import type {TestSpec} from '../../adapters/tool/types';
import type {
    ImageInfoDiff, ImageInfoUpdated, ImageInfoWithState,
    ReporterConfig, TestSpecByPath
} from '../../types';
import type {TestAdapter} from '../../adapters/test/index';
import type {TestCollectionAdapter} from '../../adapters/test-collection';
import type {ConfigAdapter} from '../../adapters/config';

export type ToolRunnerTree = GuiReportBuilderResult & Pick<GuiCliOptions, 'autoRun'> & {
    features: Feature[];
    browserFeatures: Record<string, BrowserFeature[]>
};

export interface UndoAcceptImagesResult {
    updatedImages: TreeImage[];
    removedResults: string[];
}

export class ToolRunner {
    private _testFiles: string[];
    private _toolAdapter: ToolAdapter;
    private _tree: ToolRunnerTree | null;
    protected _collection: TestCollectionAdapter | null;
    private _globalOpts: CommanderStatic;
    private _guiOpts: GuiCliOptions;
    private _reportPath: string;
    private _reporterConfig: ReporterConfig;
    private _eventSource: EventSource;
    protected _reportBuilder: GuiReportBuilder | null;
    private _testAdapters: Record<string, TestAdapter>;
    private _expectedImagesCache: Cache<[TestSpecByPath, string | undefined], string>;

    static create<T extends ToolRunner>(this: new (args: ServerArgs) => T, args: ServerArgs): T {
        return new this(args);
    }

    constructor({paths, toolAdapter, cli}: ServerArgs) {
        this._testFiles = ([] as string[]).concat(paths);
        this._toolAdapter = toolAdapter;
        this._tree = null;
        this._collection = null;

        this._globalOpts = cli.tool;
        this._guiOpts = cli.options;

        this._reporterConfig = this._toolAdapter.reporterConfig;
        this._reportPath = this._reporterConfig.path;

        this._eventSource = new EventSource();
        this._reportBuilder = null;

        this._testAdapters = {};

        this._expectedImagesCache = new Cache(getExpectedCacheKey);
    }

    get config(): ConfigAdapter {
        return this._toolAdapter.config;
    }

    get tree(): ToolRunnerTree | null {
        if (!this._tree) {
            return null;
        }

        const features: Feature[] = [];
        if (this._toolAdapter.toolName === ToolName.Testplane && getTimeTravelModeEnumSafe()) {
            features.push(TimeTravelFeature);
        }

        return Object.assign({}, this._tree, {
            browserFeatures: this._toolAdapter.browserFeatures,
            features
        });
    }

    async initialize(): Promise<void> {
        await mergeDatabasesForReuse(this._reportPath);
        await prepareLocalDatabase(this._reportPath);

        const dbClient = await SqliteClient.create({htmlReporter: this._toolAdapter.htmlReporter, reportPath: this._reportPath, reuse: true});
        const imageStore = new SqliteImageStore(dbClient);

        const imagesInfoSaver = new ImagesInfoSaver({
            imageFileSaver: this._toolAdapter.htmlReporter.imagesSaver,
            expectedPathsCache: this._expectedImagesCache,
            imageStore,
            reportPath: this._toolAdapter.htmlReporter.config.path
        });

        this._reportBuilder = GuiReportBuilder.create({
            htmlReporter: this._toolAdapter.htmlReporter,
            reporterConfig: this._reporterConfig,
            dbClient,
            imagesInfoSaver
        });
        this._toolAdapter.handleTestResults(this._reportBuilder, this._eventSource);

        this._collection = await this._readTests();

        this._toolAdapter.htmlReporter.emit(PluginEvents.DATABASE_CREATED, dbClient.getRawConnection());
        await this._reportBuilder.saveStaticFiles();

        this._reportBuilder.setApiValues(this._toolAdapter.htmlReporter.values);
        await this._handleRunnableCollection();
    }

    async _readTests(): Promise<TestCollectionAdapter> {
        return this._toolAdapter.readTests(this._testFiles, this._globalOpts);
    }

    protected _ensureReportBuilder(): GuiReportBuilder {
        if (!this._reportBuilder) {
            throw new Error('ToolRunner has to be initialized before usage');
        }

        return this._reportBuilder;
    }

    protected _ensureTestCollection(): TestCollectionAdapter {
        if (!this._collection) {
            throw new Error('ToolRunner has to be initialized before usage');
        }

        return this._collection;
    }

    async finalize(): Promise<void> {
        return this._ensureReportBuilder().finalize();
    }

    addClient(connection: Response): void {
        this._eventSource.addConnection(connection);
    }

    sendClientEvent(event: string, data: unknown): void {
        this._eventSource.emit(event, data);
    }

    getTestsDataToUpdateRefs(imageIds: string[]): TestRefUpdateData[] {
        return this._ensureReportBuilder().getTestsDataToUpdateRefs(imageIds);
    }

    getImageDataToFindEqualDiffs(imageIds: string[]): TestEqualDiffsData[] {
        const [selectedImage, ...comparedImages] = this._ensureReportBuilder().getImageDataToFindEqualDiffs(imageIds);

        const imagesWithEqualBrowserName = comparedImages.filter((image) => image.browserName === selectedImage.browserName);
        const imagesWithEqualDiffSizes = filterByEqualDiffSizes(imagesWithEqualBrowserName, (selectedImage as ImageInfoDiff).diffClusters);

        return _.isEmpty(imagesWithEqualDiffSizes) ? [] : [selectedImage].concat(imagesWithEqualDiffSizes);
    }

    async updateReferenceImage(tests: TestRefUpdateData[]): Promise<TestBranch[]> {
        const reportBuilder = this._ensureReportBuilder();

        return Promise.all(tests.map(async (test): Promise<TestBranch> => {
            const testAdapter = this._getTestAdapterById(test);
            const assertViewResults = getAssertViewResults(test.imagesInfo, testAdapter, this._toolAdapter.config.getScreenshotPath);
            const {sessionId, url} = test.metaInfo as {sessionId?: string; url?: string};

            const formattedResultWithoutAttempt = testAdapter.createTestResult({
                assertViewResults,
                status: UPDATED,
                attempt: UNKNOWN_ATTEMPT,
                error: test.error,
                sessionId,
                meta: {url},
                duration: 0
            });

            const formattedResultUpdated = await reportBuilder.updateReferenceImages(formattedResultWithoutAttempt, this._handleReferenceUpdate.bind(this));

            return reportBuilder.getTestBranch(formattedResultUpdated.id);
        }));
    }

    async undoAcceptImages(tests: TestRefUpdateData[]): Promise<UndoAcceptImagesResult> {
        const updatedImages: TreeImage[] = [], removedResultIds: string[] = [];
        const reportBuilder = this._ensureReportBuilder();

        await Promise.all(tests.map(async (test) => {
            const testAdapter = this._getTestAdapterById(test);
            const assertViewResults = getAssertViewResults(test.imagesInfo, testAdapter, this._toolAdapter.config.getScreenshotPath);
            const {sessionId, url} = test.metaInfo as {sessionId?: string; url?: string};

            const formattedResultWithoutAttempt = testAdapter.createTestResult({
                assertViewResults,
                status: UPDATED,
                attempt: UNKNOWN_ATTEMPT,
                error: test.error,
                sessionId,
                meta: {url},
                duration: 0
            });

            await Promise.all(formattedResultWithoutAttempt.imagesInfo.map(async (imageInfo) => {
                const {stateName} = imageInfo as ImageInfoWithState;

                const undoResultData = reportBuilder.undoAcceptImage(formattedResultWithoutAttempt, stateName);
                if (undoResultData === null) {
                    return;
                }

                const {
                    updatedImage,
                    removedResult,
                    previousExpectedPath,
                    shouldRemoveReference,
                    shouldRevertReference,
                    newResult
                } = undoResultData;

                updatedImage && updatedImages.push(updatedImage);
                removedResult && removedResultIds.push(removedResult.id);

                if (shouldRemoveReference) {
                    await reporterHelper.removeReferenceImage(newResult, stateName);
                }

                if (shouldRevertReference && removedResult) {
                    await reporterHelper.revertReferenceImage(removedResult, newResult, stateName);
                }

                if (previousExpectedPath) {
                    this._expectedImagesCache.set([{
                        testPath: [testAdapter.fullName],
                        browserId: testAdapter.browserId
                    }, stateName], previousExpectedPath);
                }
            }));
        }));

        return {updatedImages, removedResults: removedResultIds};
    }

    async findEqualDiffs(images: TestEqualDiffsData[]): Promise<string[]> {
        const [selectedImage, ...comparedImages] = images as (ImageInfoDiff & {diffClusters: CoordBounds[]})[];
        const {tolerance, antialiasingTolerance} = this.config;
        const compareOpts = {tolerance, antialiasingTolerance, stopOnFirstFail: true, shouldCluster: false};

        const comparisons = await Promise.all(comparedImages.map(async (image) => {
            for (let i = 0; i < image.diffClusters.length; i++) {
                const diffCluster = image.diffClusters[i];

                try {
                    const refComparisonRes = await looksSame(
                        {source: this._resolveImgPath(selectedImage.expectedImg.path), boundingBox: selectedImage.diffClusters[i]},
                        {source: this._resolveImgPath(image.expectedImg.path), boundingBox: diffCluster},
                        compareOpts
                    );

                    if (!refComparisonRes.equal) {
                        return false;
                    }

                    const actComparisonRes = await looksSame(
                        {source: this._resolveImgPath(selectedImage.actualImg.path), boundingBox: selectedImage.diffClusters[i]},
                        {source: this._resolveImgPath(image.actualImg.path), boundingBox: diffCluster},
                        compareOpts
                    );

                    if (!actComparisonRes.equal) {
                        return false;
                    }
                } catch (err) {
                    if (err !== false) {
                        throw err;
                    }
                    return false;
                }
            }

            return image;
        }));

        return comparisons.filter(Boolean).map(image => (image as TestEqualDiffsData).id);
    }

    async run(tests: TestSpec[] = []): Promise<boolean> {
        const testCollection = this._ensureTestCollection();
        const shouldRunAllTests = _.isEmpty(tests);

        // if tests are not passed, then run all tests with all available retries
        // if tests are specified, then retry only passed tests without retries
        return shouldRunAllTests
            ? this._toolAdapter.run(testCollection, tests, this._globalOpts)
            : this._toolAdapter.runWithoutRetries(testCollection, tests, this._globalOpts);
    }

    protected async _handleRunnableCollection(): Promise<void> {
        const reportBuilder = this._ensureReportBuilder();
        const queue = new PQueue({concurrency: os.cpus().length});

        for (const test of this._ensureTestCollection().tests) {
            if (test.disabled || test.silentlySkipped) {
                continue;
            }

            // TODO: remove toString after publish major version
            const testId = formatId(test.id.toString(), test.browserId);
            this._testAdapters[testId] = test;

            if (test.pending) {
                queue.add(async () => reportBuilder.addTestResult(test.createTestResult({status: SKIPPED, duration: 0})));
            } else {
                queue.add(async () => reportBuilder.addTestResult(test.createTestResult({status: IDLE, duration: 0})));
            }
        }

        await queue.onIdle();
        await this._fillTestsTree();
    }

    protected _getTestAdapterById(updateData: TestRefUpdateData): TestAdapter {
        const fullTitle = mkFullTitle(updateData);
        const testId = this._toolAdapter.toolName === ToolName.Testplane
            ? formatId(getShortMD5(fullTitle), updateData.browserId)
            : formatId(fullTitle, updateData.browserId);

        return this._testAdapters[testId];
    }

    protected _handleReferenceUpdate(testResult: ReporterTestResult, imageInfo: ImageInfoUpdated, state: string): void {
        this._expectedImagesCache.set([testResult, imageInfo.stateName], imageInfo.expectedImg.path);

        this._toolAdapter.updateReference({refImg: imageInfo.refImg, state});
    }

    async _fillTestsTree(): Promise<void> {
        const reportBuilder = this._ensureReportBuilder();

        const {autoRun} = this._guiOpts;
        const testsTree = await this._loadDataFromDatabase();

        if (testsTree && !_.isEmpty(testsTree)) {
            reportBuilder.reuseTestsTree(testsTree);
        }

        this._tree = {...reportBuilder.getResult(), autoRun, browserFeatures: {}, features: []};
    }

    protected async _loadDataFromDatabase(): Promise<Tree | null> {
        const dbPath = path.resolve(this._reportPath, LOCAL_DATABASE_NAME);

        if (await fs.pathExists(dbPath)) {
            return getTestsTreeFromDatabase(dbPath, this._reporterConfig.baseHost);
        }

        logger.warn(chalk.yellow(`Nothing to reuse in ${this._reportPath}: can not load data from ${DATABASE_URLS_JSON_NAME}`));

        return null;
    }

    protected _resolveImgPath(imgPath: string): string {
        return path.resolve(process.cwd(), this._reporterConfig.path, imgPath);
    }
}
