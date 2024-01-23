import path from 'path';

import {CommanderStatic} from '@gemini-testing/commander';
import chalk from 'chalk';
import fs from 'fs-extra';
import type Hermione from 'hermione';
import type {TestCollection, Test as HermioneTest, Config as HermioneConfig} from 'hermione';
import _ from 'lodash';
import looksSame, {CoordBounds} from 'looks-same';

import {createTestRunner} from './runner';
import {subscribeOnToolEvents} from './report-subscriber';
import {GuiReportBuilder, GuiReportBuilderResult} from '../../report-builder/gui';
import {EventSource} from '../event-source';
import {logger, getShortMD5, isUpdatedStatus} from '../../common-utils';
import * as reporterHelper from '../../reporter-helpers';
import {
    UPDATED,
    SKIPPED,
    IDLE,
    ToolName,
    DATABASE_URLS_JSON_NAME,
    LOCAL_DATABASE_NAME,
    PluginEvents
} from '../../constants';
import {formatId, mkFullTitle, mergeDatabasesForReuse, filterByEqualDiffSizes} from './utils';
import {getTestsTreeFromDatabase} from '../../db-utils/server';
import {formatTestResult, getExpectedCacheKey} from '../../server-utils';
import {
    AssertViewResult,
    HermioneTestResult,
    HtmlReporterApi,
    ImageFile,
    ImageInfoDiff, ImageInfoUpdated, ImageInfoWithState,
    ReporterConfig, TestSpecByPath
} from '../../types';
import {GuiCliOptions, GuiConfigs} from '../index';
import {Tree, TreeImage} from '../../tests-tree-builder/base';
import {TestSpec} from './runner/runner';
import {Response} from 'express';
import {TestBranch, TestEqualDiffsData, TestRefUpdateData} from '../../tests-tree-builder/gui';
import {ReporterTestResult} from '../../test-adapter';
import {SqliteClient} from '../../sqlite-client';
import PQueue from 'p-queue';
import os from 'os';
import {Cache} from '../../cache';
import {ImagesInfoSaver} from '../../images-info-saver';
import {SqliteImageStore} from '../../image-store';

type ToolRunnerArgs = [paths: string[], hermione: Hermione & HtmlReporterApi, configs: GuiConfigs];
type ReplModeOption = {
    enabled: boolean;
    beforeTest: boolean;
    onFail: boolean;
}

export type ToolRunnerTree = GuiReportBuilderResult & Pick<GuiCliOptions, 'autoRun'>;

export interface UndoAcceptImagesResult {
    updatedImages: TreeImage[];
    removedResults: string[];
}

export class ToolRunner {
    private _testFiles: string[];
    private _hermione: Hermione & HtmlReporterApi;
    private _tree: ToolRunnerTree | null;
    protected _collection: TestCollection | null;
    private _globalOpts: CommanderStatic;
    private _guiOpts: GuiCliOptions;
    private _reportPath: string;
    private _pluginConfig: ReporterConfig;
    private _eventSource: EventSource;
    protected _reportBuilder: GuiReportBuilder | null;
    private _tests: Record<string, HermioneTest>;
    private _expectedImagesCache: Cache<[TestSpecByPath, string | undefined], string>;

    static create<T extends ToolRunner>(this: new (...args: ToolRunnerArgs) => T, ...args: ToolRunnerArgs): T {
        return new this(...args);
    }

    constructor(...[paths, hermione, {program: globalOpts, pluginConfig, options: guiOpts}]: ToolRunnerArgs) {
        this._testFiles = ([] as string[]).concat(paths);
        this._hermione = hermione;
        this._tree = null;
        this._collection = null;

        this._globalOpts = globalOpts;
        this._guiOpts = guiOpts;
        this._reportPath = pluginConfig.path;
        this._pluginConfig = pluginConfig;

        this._eventSource = new EventSource();
        this._reportBuilder = null;

        this._tests = {};

        this._expectedImagesCache = new Cache(getExpectedCacheKey);
    }

    get config(): HermioneConfig {
        return this._hermione.config;
    }

    get tree(): ToolRunnerTree | null {
        return this._tree;
    }

    async initialize(): Promise<void> {
        await mergeDatabasesForReuse(this._reportPath);

        const dbClient = await SqliteClient.create({htmlReporter: this._hermione.htmlReporter, reportPath: this._reportPath, reuse: true});
        const imageStore = new SqliteImageStore(dbClient);

        const imagesInfoSaver = new ImagesInfoSaver({
            imageFileSaver: this._hermione.htmlReporter.imagesSaver,
            expectedPathsCache: this._expectedImagesCache,
            imageStore,
            reportPath: this._hermione.htmlReporter.config.path
        });

        this._reportBuilder = GuiReportBuilder.create(this._hermione.htmlReporter, this._pluginConfig, {dbClient, imagesInfoSaver});
        this._subscribeOnEvents();

        this._collection = await this._readTests();

        this._hermione.htmlReporter.emit(PluginEvents.DATABASE_CREATED, dbClient.getRawConnection());
        await this._reportBuilder.saveStaticFiles();

        this._reportBuilder.setApiValues(this._hermione.htmlReporter.values);
        await this._handleRunnableCollection();
    }

    async _readTests(): Promise<TestCollection> {
        const {grep, set: sets, browser: browsers} = this._globalOpts;
        const replMode = this._getReplModeOption();

        return this._hermione.readTests(this._testFiles, {grep, sets, browsers, replMode});
    }

    _getReplModeOption(): ReplModeOption {
        const {repl = false, replBeforeTest = false, replOnFail = false} = this._globalOpts;

        return {
            enabled: repl || replBeforeTest || replOnFail,
            beforeTest: replBeforeTest,
            onFail: replOnFail
        };
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
            const updateResult = this._createHermioneTestResult(test);

            const formattedResultWithoutAttempt = formatTestResult(updateResult, UPDATED);
            const formattedResult = reportBuilder.provideAttempt(formattedResultWithoutAttempt);

            const formattedResultUpdated = await reporterHelper.updateReferenceImages(formattedResult, this._reportPath, this._handleReferenceUpdate.bind(this));

            await reportBuilder.addTestResult(formattedResultUpdated);

            return reportBuilder.getTestBranch(formattedResultUpdated.id);
        }));
    }

    async undoAcceptImages(tests: TestRefUpdateData[]): Promise<UndoAcceptImagesResult> {
        const updatedImages: TreeImage[] = [], removedResultIds: string[] = [];
        const reportBuilder = this._ensureReportBuilder();

        await Promise.all(tests.map(async (test) => {
            const updateResult = this._createHermioneTestResult(test);
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

                if (previousExpectedPath && (updateResult as HermioneTest).fullTitle) {
                    this._expectedImagesCache.set([{
                        testPath: [(updateResult as HermioneTest).fullTitle()],
                        browserId: (updateResult as HermioneTest).browserId
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
        const {grep, set: sets, browser: browsers, devtools = false} = this._globalOpts;
        const replMode = this._getReplModeOption();

        return createTestRunner(this._ensureTestCollection(), tests)
            .run((collection) => this._hermione.run(collection, {grep, sets, browsers, devtools, replMode}));
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

    protected _isSilentlySkipped({silentSkip, parent}: HermioneTest): boolean {
        return silentSkip || parent && this._isSilentlySkipped(parent);
    }

    protected _subscribeOnEvents(): void {
        subscribeOnToolEvents(this._hermione, this._ensureReportBuilder(), this._eventSource);
    }

    protected _createHermioneTestResult(updateData: TestRefUpdateData): HermioneTestResult {
        const {browserId} = updateData;
        const fullTitle = mkFullTitle(updateData);
        const testId = formatId(getShortMD5(fullTitle), browserId);
        const hermioneTest = this._tests[testId];
        const {sessionId, url} = updateData.metaInfo as {sessionId?: string; url?: string};
        const assertViewResults: AssertViewResult[] = [];

        updateData.imagesInfo
            .filter(({stateName, actualImg}) => Boolean(stateName) && Boolean(actualImg))
            .forEach((imageInfo) => {
                const {stateName, actualImg} = imageInfo as {stateName: string, actualImg: ImageFile};
                const path = this._hermione.config.browsers[browserId].getScreenshotPath(hermioneTest, stateName);
                const refImg = {path, size: actualImg.size};

                assertViewResults.push({stateName, refImg, currImg: actualImg, isUpdated: isUpdatedStatus(imageInfo.status)});
            });

        const hermioneTestResult: HermioneTestResult = _.merge({}, hermioneTest, {
            assertViewResults,
            err: updateData.error as HermioneTestResult['err'],
            sessionId,
            meta: {url}
        } satisfies Partial<HermioneTestResult>) as unknown as HermioneTestResult;

        // _.merge can't fully clone test object since hermione@7+
        // TODO: use separate object to represent test results. Do not extend test object with test results
        return hermioneTest && hermioneTest.clone
            ? Object.assign(hermioneTest.clone(), hermioneTestResult)
            : hermioneTestResult;
    }

    protected _handleReferenceUpdate(testResult: ReporterTestResult, imageInfo: ImageInfoUpdated, state: string): void {
        this._expectedImagesCache.set([testResult, imageInfo.stateName], imageInfo.expectedImg.path);

        this._hermione.emit(
            this._hermione.events.UPDATE_REFERENCE,
            {refImg: imageInfo.refImg, state}
        );
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
            return getTestsTreeFromDatabase(ToolName.Hermione, dbPath, this._pluginConfig.baseHost);
        }

        logger.warn(chalk.yellow(`Nothing to reuse in ${this._reportPath}: can not load data from ${DATABASE_URLS_JSON_NAME}`));

        return null;
    }

    protected _resolveImgPath(imgPath: string): string {
        return path.resolve(process.cwd(), this._pluginConfig.path, imgPath);
    }
}
