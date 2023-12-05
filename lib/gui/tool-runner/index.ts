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
import {logger, getShortMD5} from '../../common-utils';
import * as reporterHelper from '../../reporter-helpers';
import {
    UPDATED,
    SKIPPED,
    IDLE,
    TestStatus,
    ToolName,
    DATABASE_URLS_JSON_NAME,
    LOCAL_DATABASE_NAME,
    PluginEvents
} from '../../constants';
import {formatId, mkFullTitle, mergeDatabasesForReuse, filterByEqualDiffSizes} from './utils';
import {getTestsTreeFromDatabase} from '../../db-utils/server';
import {formatTestResult} from '../../server-utils';
import {
    AssertViewResult,
    HermioneTestResult,
    HtmlReporterApi,
    ImageData,
    ImageInfoFail,
    ReporterConfig
} from '../../types';
import {GuiCliOptions, GuiConfigs} from '../index';
import {Tree, TreeImage} from '../../tests-tree-builder/base';
import {TestSpec} from './runner/runner';
import {Response} from 'express';
import {TestBranch, TestEqualDiffsData, TestRefUpdateData} from '../../tests-tree-builder/gui';
import {ReporterTestResult} from '../../test-adapter';
import {ImagesInfoFormatter} from '../../image-handler';
import {SqliteClient} from '../../sqlite-client';
import {TestAttemptManager} from '../../test-attempt-manager';

type ToolRunnerArgs = [paths: string[], hermione: Hermione & HtmlReporterApi, configs: GuiConfigs];

export type ToolRunnerTree = GuiReportBuilderResult & Pick<GuiCliOptions, 'autoRun'>;

interface HermioneTestExtended extends HermioneTest {
    assertViewResults: {stateName: string, refImg: ImageData, currImg: ImageData};
    attempt: number;
    imagesInfo: Pick<ImageInfoFail, 'status' | 'stateName' | 'actualImg' | 'expectedImg'>[];
}

type HermioneTestPlain = Pick<HermioneTestExtended & HermioneTestResult, 'assertViewResults' | 'imagesInfo' | 'sessionId' | 'attempt' | 'meta' | 'updated'>;

export interface UndoAcceptImagesResult {
    updatedImages: TreeImage[];
    removedResults: string[];
}

// TODO: get rid of this function. It allows to format raw test, but is type-unsafe.
const formatTestResultUnsafe = (
    test: HermioneTest | HermioneTestExtended | HermioneTestPlain,
    status: TestStatus,
    attempt: number,
    {imageHandler}: {imageHandler: ImagesInfoFormatter}
): ReporterTestResult => {
    return formatTestResult(test as HermioneTestResult, status, attempt, {imageHandler});
};

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
        const testAttemptManager = new TestAttemptManager();

        this._reportBuilder = GuiReportBuilder.create(this._hermione.htmlReporter, this._pluginConfig, {dbClient, testAttemptManager});
        this._subscribeOnEvents();

        this._collection = await this._readTests();

        this._hermione.htmlReporter.emit(PluginEvents.DATABASE_CREATED, dbClient.getRawConnection());
        await this._reportBuilder.saveStaticFiles();

        this._reportBuilder.setApiValues(this._hermione.htmlReporter.values);
        await this._handleRunnableCollection();
    }

    async _readTests(): Promise<TestCollection> {
        const {grep, set: sets, browser: browsers} = this._globalOpts;

        return this._hermione.readTests(this._testFiles, {grep, sets, browsers});
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
        const imagesWithEqualDiffSizes = filterByEqualDiffSizes(imagesWithEqualBrowserName, (selectedImage as ImageInfoFail).diffClusters);

        return _.isEmpty(imagesWithEqualDiffSizes) ? [] : [selectedImage].concat(imagesWithEqualDiffSizes);
    }

    async updateReferenceImage(tests: TestRefUpdateData[]): Promise<TestBranch[]> {
        const reportBuilder = this._ensureReportBuilder();

        return Promise.all(tests.map(async (test): Promise<TestBranch> => {
            const updateResult = this._prepareTestResult(test);

            const fullName = test.suite.path.join(' ');
            const updateAttempt = reportBuilder.testAttemptManager.registerAttempt({fullName, browserId: test.browserId}, UPDATED);
            const formattedResult = formatTestResultUnsafe(updateResult, UPDATED, updateAttempt, reportBuilder);
            const failResultId = formattedResult.id;

            updateResult.attempt = updateAttempt;

            await Promise.all(updateResult.imagesInfo.map(async (imageInfo) => {
                const {stateName} = imageInfo;

                await reporterHelper.updateReferenceImage(formattedResult, this._reportPath, stateName);

                const result = _.extend(updateResult, {refImg: imageInfo.expectedImg});
                this._emitUpdateReference(result, stateName);
            }));

            reportBuilder.addUpdated(formattedResult, failResultId);

            return reportBuilder.getTestBranch(formattedResult.id);
        }));
    }

    async undoAcceptImages(tests: TestRefUpdateData[]): Promise<UndoAcceptImagesResult> {
        const updatedImages: TreeImage[] = [], removedResults: string[] = [];
        const reportBuilder = this._ensureReportBuilder();

        await Promise.all(tests.map(async (test) => {
            const updateResult = this._prepareTestResult(test);
            const fullName = test.suite.path.join(' ');
            const attempt = reportBuilder.testAttemptManager.removeAttempt({fullName, browserId: test.browserId});
            const formattedResult = formatTestResultUnsafe(updateResult, UPDATED, attempt, reportBuilder);

            await Promise.all(updateResult.imagesInfo.map(async (imageInfo) => {
                const {stateName} = imageInfo;

                const undoResultData = reportBuilder.undoAcceptImage(formattedResult, stateName);
                if (undoResultData === null) {
                    return;
                }

                const {
                    updatedImage,
                    removedResult,
                    previousExpectedPath,
                    shouldRemoveReference,
                    shouldRevertReference
                } = undoResultData;

                updatedImage && updatedImages.push(updatedImage);
                removedResult && removedResults.push(removedResult);

                if (shouldRemoveReference) {
                    await reporterHelper.removeReferenceImage(formattedResult, stateName);
                }

                if (shouldRevertReference && removedResult) {
                    await reporterHelper.revertReferenceImage(removedResult, formattedResult, stateName);
                }

                if (previousExpectedPath && (updateResult as HermioneTest).fullTitle) {
                    reportBuilder.imageHandler.updateCacheExpectedPath({
                        fullName: (updateResult as HermioneTest).fullTitle(),
                        browserId: (updateResult as HermioneTest).browserId
                    }, stateName, previousExpectedPath);
                }
            }));
        }));

        return {updatedImages, removedResults};
    }

    async findEqualDiffs(images: TestEqualDiffsData[]): Promise<string[]> {
        const [selectedImage, ...comparedImages] = images as (ImageInfoFail & {diffClusters: CoordBounds[]})[];
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
        const {grep, set: sets, browser: browsers} = this._globalOpts;

        return createTestRunner(this._ensureTestCollection(), tests)
            .run((collection) => this._hermione.run(collection, {grep, sets, browsers}));
    }

    protected async _handleRunnableCollection(): Promise<void> {
        const reportBuilder = this._ensureReportBuilder();

        this._ensureTestCollection().eachTest((test, browserId) => {
            if (test.disabled || this._isSilentlySkipped(test)) {
                return;
            }

            // TODO: remove toString after publish major version
            const testId = formatId(test.id.toString(), browserId);
            this._tests[testId] = _.extend(test, {browserId});

            if (test.pending) {
                const attempt = reportBuilder.testAttemptManager.registerAttempt({fullName: test.fullTitle(), browserId: test.browserId}, SKIPPED);
                reportBuilder.addSkipped(formatTestResultUnsafe(test, SKIPPED, attempt, reportBuilder));
            } else {
                const attempt = reportBuilder.testAttemptManager.registerAttempt({fullName: test.fullTitle(), browserId: test.browserId}, IDLE);
                reportBuilder.addIdle(formatTestResultUnsafe(test, IDLE, attempt, reportBuilder));
            }
        });

        await this._fillTestsTree();
    }

    protected _isSilentlySkipped({silentSkip, parent}: HermioneTest): boolean {
        return silentSkip || parent && this._isSilentlySkipped(parent);
    }

    protected _subscribeOnEvents(): void {
        subscribeOnToolEvents(this._hermione, this._ensureReportBuilder(), this._eventSource, this._reportPath);
    }

    protected _prepareTestResult(test: TestRefUpdateData): HermioneTestExtended | HermioneTestPlain {
        const {browserId, attempt} = test;
        const fullTitle = mkFullTitle(test);
        const testId = formatId(getShortMD5(fullTitle), browserId);
        const rawTest = this._tests[testId];
        const {sessionId, url} = test.metaInfo;
        const assertViewResults: AssertViewResult[] = [];

        const imagesInfo = test.imagesInfo
            .filter(({stateName, actualImg}) => Boolean(stateName) && Boolean(actualImg))
            .map((imageInfo) => {
                const {stateName, actualImg} = imageInfo as {stateName: string, actualImg: ImageData};
                const path = this._hermione.config.browsers[browserId].getScreenshotPath(rawTest, stateName);
                const refImg = {path, size: actualImg.size};

                assertViewResults.push({stateName, refImg, currImg: actualImg});

                return _.extend(imageInfo, {expectedImg: refImg});
            });

        const res = _.merge({}, rawTest, {assertViewResults, imagesInfo, sessionId, attempt, meta: {url}, updated: true});

        // _.merge can't fully clone test object since hermione@7+
        // TODO: use separate object to represent test results. Do not extend test object with test results
        return rawTest && rawTest.clone
            ? Object.assign(rawTest.clone(), res)
            : res;
    }

    protected _emitUpdateReference({refImg}: {refImg: ImageData}, state: string): void {
        this._hermione.emit(
            this._hermione.events.UPDATE_REFERENCE,
            {refImg, state}
        );
    }

    async _fillTestsTree(): Promise<void> {
        const reportBuilder = this._ensureReportBuilder();

        const {autoRun} = this._guiOpts;
        const testsTree = await this._loadDataFromDatabase();

        if (!_.isEmpty(testsTree)) {
            reportBuilder.reuseTestsTree(testsTree);
        }

        this._tree = {...reportBuilder.getResult(), autoRun};
    }

    protected async _loadDataFromDatabase(): Promise<Tree | null> {
        const dbPath = path.resolve(this._reportPath, LOCAL_DATABASE_NAME);

        if (await fs.pathExists(dbPath)) {
            return getTestsTreeFromDatabase(ToolName.Hermione, dbPath);
        }

        logger.warn(chalk.yellow(`Nothing to reuse in ${this._reportPath}: can not load data from ${DATABASE_URLS_JSON_NAME}`));

        return null;
    }

    protected _resolveImgPath(imgPath: string): string {
        return path.resolve(process.cwd(), this._pluginConfig.path, imgPath);
    }
}
