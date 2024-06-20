import path from 'node:path';
import os from 'node:os';

import {CommanderStatic} from '@gemini-testing/commander';
import chalk from 'chalk';
import fs from 'fs-extra';
import type {TestCollection, Test as TestplaneTest, Config as TestplaneConfig} from 'testplane';
import _ from 'lodash';
import looksSame, {CoordBounds} from 'looks-same';
import PQueue from 'p-queue';
import type {Response} from 'express';

import {GuiReportBuilder, GuiReportBuilderResult} from '../../report-builder/gui';
import {EventSource} from '../event-source';
import {TestplaneToolAdapter} from '../../adapters/tool/testplane';
import {SqliteClient} from '../../sqlite-client';
import {Cache} from '../../cache';
import {ImagesInfoSaver} from '../../images-info-saver';
import {SqliteImageStore} from '../../image-store';
import * as reporterHelper from '../../reporter-helpers';
import {logger, getShortMD5, isUpdatedStatus} from '../../common-utils';
import {formatId, mkFullTitle, mergeDatabasesForReuse, filterByEqualDiffSizes} from './utils';
import {formatTestResult, getExpectedCacheKey} from '../../server-utils';
import {getTestsTreeFromDatabase} from '../../db-utils/server';
import {
    UPDATED,
    SKIPPED,
    IDLE,
    ToolName,
    DATABASE_URLS_JSON_NAME,
    LOCAL_DATABASE_NAME,
    PluginEvents
} from '../../constants';

import type {GuiCliOptions, ServerArgs} from '../index';
import type {TestBranch, TestEqualDiffsData, TestRefUpdateData} from '../../tests-tree-builder/gui';
import type {ReporterTestResult} from '../../adapters/test-result';
import type {Tree, TreeImage} from '../../tests-tree-builder/base';
import type {TestSpec} from '../../adapters/tool/types';
import type {
    AssertViewResult,
    TestplaneTestResult,
    ImageFile,
    ImageInfoDiff, ImageInfoUpdated, ImageInfoWithState,
    ReporterConfig, TestSpecByPath, RefImageFile
} from '../../types';

export type ToolRunnerTree = GuiReportBuilderResult & Pick<GuiCliOptions, 'autoRun'>;

export interface UndoAcceptImagesResult {
    updatedImages: TreeImage[];
    removedResults: string[];
}

export class ToolRunner {
    private _testFiles: string[];
    private _toolAdapter: TestplaneToolAdapter;
    private _tree: ToolRunnerTree | null;
    protected _collection: TestCollection | null;
    private _globalOpts: CommanderStatic;
    private _guiOpts: GuiCliOptions;
    private _reportPath: string;
    private _reporterConfig: ReporterConfig;
    private _eventSource: EventSource;
    protected _reportBuilder: GuiReportBuilder | null;
    private _tests: Record<string, TestplaneTest>;
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

        this._tests = {};

        this._expectedImagesCache = new Cache(getExpectedCacheKey);
    }

    get config(): TestplaneConfig {
        return this._toolAdapter.config;
    }

    get tree(): ToolRunnerTree | null {
        return this._tree;
    }

    async initialize(): Promise<void> {
        await mergeDatabasesForReuse(this._reportPath);

        const dbClient = await SqliteClient.create({htmlReporter: this._toolAdapter.htmlReporter, reportPath: this._reportPath, reuse: true});
        const imageStore = new SqliteImageStore(dbClient);

        const imagesInfoSaver = new ImagesInfoSaver({
            imageFileSaver: this._toolAdapter.htmlReporter.imagesSaver,
            expectedPathsCache: this._expectedImagesCache,
            imageStore,
            reportPath: this._toolAdapter.htmlReporter.config.path
        });

        this._reportBuilder = GuiReportBuilder.create(this._toolAdapter.htmlReporter, this._reporterConfig, {dbClient, imagesInfoSaver});
        this._toolAdapter.handleTestResults(this._reportBuilder, this._eventSource);

        this._collection = await this._readTests();

        this._toolAdapter.htmlReporter.emit(PluginEvents.DATABASE_CREATED, dbClient.getRawConnection());
        await this._reportBuilder.saveStaticFiles();

        this._reportBuilder.setApiValues(this._toolAdapter.htmlReporter.values);
        await this._handleRunnableCollection();
    }

    async _readTests(): Promise<TestCollection> {
        return this._toolAdapter.readTests(this._testFiles, this._globalOpts);
    }

    protected _ensureReportBuilder(): GuiReportBuilder {
        if (!this._reportBuilder) {
            throw new Error('ToolRunner has to be initialized before usage');
        }

        return this._reportBuilder;
    }

    protected _ensureTestCollection(): TestCollection {
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
            const updateResult = this._createTestplaneTestResult(test);
            const currentResult = formatTestResult(updateResult, UPDATED, test.attempt);
            const estimatedStatus = reportBuilder.getUpdatedReferenceTestStatus(currentResult);

            const formattedResultWithoutAttempt = formatTestResult(updateResult, UPDATED);
            const formattedResult = reportBuilder.provideAttempt(formattedResultWithoutAttempt);

            const formattedResultUpdated = await reporterHelper.updateReferenceImages(formattedResult, this._reportPath, this._handleReferenceUpdate.bind(this));

            await reportBuilder.addTestResult(formattedResultUpdated, {status: estimatedStatus});

            return reportBuilder.getTestBranch(formattedResultUpdated.id);
        }));
    }

    async undoAcceptImages(tests: TestRefUpdateData[]): Promise<UndoAcceptImagesResult> {
        const updatedImages: TreeImage[] = [], removedResultIds: string[] = [];
        const reportBuilder = this._ensureReportBuilder();

        await Promise.all(tests.map(async (test) => {
            const updateResult = this._createTestplaneTestResult(test);
            const formattedResultWithoutAttempt = formatTestResult(updateResult, UPDATED);

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

                if (previousExpectedPath && (updateResult as TestplaneTest).fullTitle) {
                    this._expectedImagesCache.set([{
                        testPath: [(updateResult as TestplaneTest).fullTitle()],
                        browserId: (updateResult as TestplaneTest).browserId
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

        return this._toolAdapter.run(testCollection, tests, this._globalOpts);
    }

    protected async _handleRunnableCollection(): Promise<void> {
        const reportBuilder = this._ensureReportBuilder();
        const queue = new PQueue({concurrency: os.cpus().length});

        this._ensureTestCollection().eachTest((test, browserId) => {
            if (test.disabled || this._isSilentlySkipped(test)) {
                return;
            }

            // TODO: remove toString after publish major version
            const testId = formatId(test.id.toString(), browserId);
            this._tests[testId] = _.extend(test, {browserId});

            if (test.pending) {
                queue.add(async () => reportBuilder.addTestResult(formatTestResult(test, SKIPPED)));
            } else {
                queue.add(async () => reportBuilder.addTestResult(formatTestResult(test, IDLE)));
            }
        });

        await queue.onIdle();
        await this._fillTestsTree();
    }

    protected _isSilentlySkipped({silentSkip, parent}: TestplaneTest): boolean {
        return Boolean(silentSkip || parent && this._isSilentlySkipped(parent));
    }

    protected _createTestplaneTestResult(updateData: TestRefUpdateData): TestplaneTestResult {
        const {browserId} = updateData;
        const fullTitle = mkFullTitle(updateData);
        const testId = formatId(getShortMD5(fullTitle), browserId);
        const testplaneTest = this._tests[testId];
        const {sessionId, url} = updateData.metaInfo as {sessionId?: string; url?: string};
        const assertViewResults: AssertViewResult[] = [];

        updateData.imagesInfo
            .filter(({stateName, actualImg}) => Boolean(stateName) && Boolean(actualImg))
            .forEach((imageInfo) => {
                const {stateName, actualImg} = imageInfo as {stateName: string, actualImg: ImageFile};
                const absoluteRefImgPath = this._toolAdapter.config.browsers[browserId].getScreenshotPath(testplaneTest, stateName);
                const relativeRefImgPath = absoluteRefImgPath && path.relative(process.cwd(), absoluteRefImgPath);
                const refImg: RefImageFile = {path: absoluteRefImgPath, relativePath: relativeRefImgPath, size: actualImg.size};

                assertViewResults.push({stateName, refImg, currImg: actualImg, isUpdated: isUpdatedStatus(imageInfo.status)});
            });

        const testplaneTestResult: TestplaneTestResult = _.merge({}, testplaneTest, {
            assertViewResults,
            err: updateData.error as TestplaneTestResult['err'],
            sessionId,
            meta: {url}
        } satisfies Partial<TestplaneTestResult>) as unknown as TestplaneTestResult;

        // _.merge can't fully clone test object since hermione@7+
        // TODO: use separate object to represent test results. Do not extend test object with test results
        return testplaneTest && testplaneTest.clone
            ? Object.assign(testplaneTest.clone(), testplaneTestResult)
            : testplaneTestResult;
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

        this._tree = {...reportBuilder.getResult(), autoRun};
    }

    protected async _loadDataFromDatabase(): Promise<Tree | null> {
        const dbPath = path.resolve(this._reportPath, LOCAL_DATABASE_NAME);

        if (await fs.pathExists(dbPath)) {
            return getTestsTreeFromDatabase(ToolName.Testplane, dbPath, this._reporterConfig.baseHost);
        }

        logger.warn(chalk.yellow(`Nothing to reuse in ${this._reportPath}: can not load data from ${DATABASE_URLS_JSON_NAME}`));

        return null;
    }

    protected _resolveImgPath(imgPath: string): string {
        return path.resolve(process.cwd(), this._reporterConfig.path, imgPath);
    }
}
