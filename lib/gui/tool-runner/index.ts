import path from 'node:path';
import os from 'node:os';
import {performance} from 'node:perf_hooks';

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
import {logger, getShortMD5, isUpdatedStatus} from '../../common-utils';
import {formatId, mkFullTitle, mergeDatabasesForReuse, filterByEqualDiffSizes, prepareLocalDatabase} from './utils';
import {getExpectedCacheKey, getTimeTravelModeEnumSafe} from '../../server-utils';
import {getTestsTreeFromDatabase} from '../../db-utils/server';
import {
    UPDATED,
    SKIPPED,
    IDLE,
    ToolName,
    DATABASE_URLS_JSON_NAME,
    LOCAL_DATABASE_NAME,
    DEFAULT_TITLE_DELIMITER,
    PluginEvents,
    UNKNOWN_ATTEMPT, BrowserFeature, Feature, TimeTravelFeature
} from '../../constants';

import {ToolAdapter} from '../../adapters/tool';
import type {GuiCliOptions, ServerArgs} from '../index';
import type {TestBranch, TestEqualDiffsData, TestRefUpdateData} from '../../tests-tree-builder/gui';
import type {ReporterTestResult} from '../../adapters/test-result';
import type {Tree, TreeImage} from '../../tests-tree-builder/base';
import {createTreePatch, snapshotTree, TreePatch, TreePatchScope} from '../../tests-tree-builder/tree-patch';
import type {TestSpec} from '../../adapters/tool/types';
import type {
    AssertViewResult,
    ImageFile,
    ImageInfoDiff, ImageInfoUpdated, ImageInfoWithState,
    ReporterConfig, TestSpecByPath, RefImageFile
} from '../../types';
import type {TestAdapter} from '../../adapters/test/index';
import type {TestCollectionAdapter} from '../../adapters/test-collection';
import type {ConfigAdapter} from '../../adapters/config';

export type ToolRunnerTree = GuiReportBuilderResult & Pick<GuiCliOptions, 'autoRun'> & {
    features: Feature[];
    browserFeatures: Record<string, BrowserFeature[]>
};

export type TestsTreeUpdate = TreePatch | {
    replacement: ToolRunnerTree;
    performance?: TreePatch['performance'];
};

export interface UndoAcceptImagesResult {
    updatedImages: TreeImage[];
    removedResults: string[];
}

export interface RunParams {
    retry?: boolean;
}

const logWatchPerformance = (id: number, operation: string, startedAt: number, details?: Record<string, unknown>): void => {
    const duration = (performance.now() - startedAt).toFixed(1);
    const detailsText = details ? ` ${JSON.stringify(details)}` : '';

    logger.log(`[watch-perf][server][#${id}] ${operation}: ${duration}ms${detailsText}`);
};

const isNoTestsFoundError = (error: unknown): boolean =>
    error instanceof Error && error.message.startsWith('There are no tests found');

const getTestStructureSignature = (test: TestAdapter): string => JSON.stringify([
    test.browserId,
    path.resolve(test.file),
    test.titlePath,
    test.disabled,
    test.silentlySkipped,
    test.pending
]);

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
    private _testsByFile: Map<string, TestAdapter[]>;
    private _testFileBySpec: Map<string, string>;
    private _testAdapterIdsByFile: Map<string, Set<string>>;
    private _collectionNeedsFullRead: boolean;
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
        this._testsByFile = new Map();
        this._testFileBySpec = new Map();
        this._testAdapterIdsByFile = new Map();
        this._collectionNeedsFullRead = false;

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

        this._setCollection(await this._readTests());

        this._toolAdapter.htmlReporter.emit(PluginEvents.DATABASE_CREATED, dbClient.getRawConnection());
        await this._reportBuilder.saveStaticFiles();

        this._reportBuilder.setApiValues(this._toolAdapter.htmlReporter.values);
        await this._handleRunnableCollection();
    }

    async _readTests(): Promise<TestCollectionAdapter> {
        return this._toolAdapter.readTests(this._testFiles, this._globalOpts);
    }

    async refreshTests(): Promise<void> {
        this._setCollection(await this._readTests());

        const reportBuilder = this._ensureReportBuilder();
        reportBuilder.resetTree();
        this._testAdapters = {};
        this._testAdapterIdsByFile.clear();

        await this._handleRunnableCollection();
        await this._fillTestsTree(reportBuilder.buildTreeFromCurrentDb());
    }

    async refreshTestsIfChanged(
        changedFiles: string[],
        removedDirectories: string[],
        onChanged: (changed: boolean) => void,
        onUpdated: (update: TestsTreeUpdate) => void,
        performanceId: number
    ): Promise<void> {
        const totalStartedAt = performance.now();
        let stageStartedAt = performance.now();
        const normalizedFiles = new Set(changedFiles.map(file => path.resolve(file)));
        const normalizedDirectories = removedDirectories.map(directory => path.resolve(directory));
        const isInsideRemovedDirectory = (file: string): boolean => normalizedDirectories.some(directory => {
            const relativePath = path.relative(directory, file);
            return relativePath !== '' && !relativePath.startsWith(`..${path.sep}`) && relativePath !== '..' && !path.isAbsolute(relativePath);
        });
        const affectedFiles = new Set(normalizedFiles);
        for (const testFile of this._testsByFile.keys()) {
            if (isInsideRemovedDirectory(testFile)) {
                affectedFiles.add(testFile);
            }
        }
        const isChangedFile = (test: TestAdapter): boolean => affectedFiles.has(path.resolve(test.file));
        const currentTests = [...affectedFiles].flatMap(file => this._testsByFile.get(file) ?? []);
        const current = currentTests.map(getTestStructureSignature).sort();
        logWatchPerformance(performanceId, 'prepare affected files and current signatures', stageStartedAt, {
            changedFiles: changedFiles.length,
            removedDirectories: removedDirectories.length,
            affectedFiles: affectedFiles.size,
            currentTests: current.length
        });

        stageStartedAt = performance.now();
        const existingFiles = await Promise.all(changedFiles.map(async file => await fs.pathExists(file) ? file : null));
        const filesToRead = existingFiles.filter((file): file is string => Boolean(file));
        logWatchPerformance(performanceId, 'check changed files existence', stageStartedAt, {filesToRead: filesToRead.length});
        let next: string[] = [];
        let changedCollection: TestCollectionAdapter = {tests: []};

        if (this._ensureTestCollection().hasFocusedTests) {
            await this._refreshTestsFromFullCollection(onChanged, onUpdated, performanceId, totalStartedAt);

            return;
        }

        if (filesToRead.length) {
            try {
                stageStartedAt = performance.now();
                changedCollection = await this._toolAdapter.readTests(filesToRead, this._globalOpts);
                logWatchPerformance(performanceId, 'read changed files', stageStartedAt, {tests: changedCollection.tests.length});

                if (changedCollection.hasFocusedTests) {
                    await this._refreshTestsFromFullCollection(onChanged, onUpdated, performanceId, totalStartedAt);

                    return;
                }

                stageStartedAt = performance.now();
                next = changedCollection.tests.filter(isChangedFile).map(getTestStructureSignature).sort();
                logWatchPerformance(performanceId, 'build changed files signatures', stageStartedAt, {tests: next.length});
            } catch (error) {
                if (this._toolAdapter.hasFocusedTestsInLastRead) {
                    await this._refreshTestsFromFullCollection(onChanged, onUpdated, performanceId, totalStartedAt);

                    return;
                }

                if (isNoTestsFoundError(error)) {
                    // Testplane throws instead of returning an empty collection
                    // when the changed file no longer contains any tests.
                    logWatchPerformance(performanceId, 'read changed files (no tests found)', stageStartedAt, {tests: 0});
                } else {
                    // If a partial read fails for another reason, use the full
                    // collection to determine whether the tree has changed.
                    stageStartedAt = performance.now();
                    const collection = await this._readTests();
                    logWatchPerformance(performanceId, 'fallback: read all tests', stageStartedAt, {tests: collection.tests.length});

                    stageStartedAt = performance.now();
                    const allCurrent = this._ensureTestCollection().tests.map(getTestStructureSignature).sort();
                    const allNext = collection.tests.map(getTestStructureSignature).sort();
                    logWatchPerformance(performanceId, 'fallback: compare all signatures', stageStartedAt, {current: allCurrent.length, next: allNext.length});

                    if (_.isEqual(allCurrent, allNext)) {
                        this._collectionNeedsFullRead = true;
                        onChanged(false);
                        logWatchPerformance(performanceId, 'total (no structural changes)', totalStartedAt);
                        return;
                    }

                    onChanged(true);
                    const testsToAdd = collection.tests.filter(isChangedFile);
                    this._validateUniqueFullNames(collection.tests);
                    onUpdated(await this._applyChangedFiles(affectedFiles, currentTests, testsToAdd, performanceId));
                    this._setCollection(collection);
                    logWatchPerformance(performanceId, 'total', totalStartedAt);

                    return;
                }
            }
        }

        if (!removedDirectories.length && _.isEqual(current, next)) {
            this._collectionNeedsFullRead = true;
            onChanged(false);
            logWatchPerformance(performanceId, 'total (no structural changes)', totalStartedAt);
            return;
        }

        onChanged(true);
        stageStartedAt = performance.now();
        const testsToAdd = changedCollection.tests.filter(isChangedFile);
        const nextTests = this._getTestsAfterReplacement(affectedFiles, testsToAdd);
        this._validateChangedTestsUnique(affectedFiles, testsToAdd);
        logWatchPerformance(performanceId, 'merge changed tests into collection', stageStartedAt, {
            changedTests: testsToAdd.length,
            totalTests: nextTests.length
        });
        onUpdated(await this._applyChangedFiles(affectedFiles, currentTests, testsToAdd, performanceId));
        this._replaceTestsInCollection(affectedFiles, testsToAdd, nextTests);
        logWatchPerformance(performanceId, 'total', totalStartedAt);
    }

    private async _refreshTestsFromFullCollection(
        onChanged: (changed: boolean) => void,
        onUpdated: (update: TestsTreeUpdate) => void,
        performanceId: number,
        totalStartedAt: number
    ): Promise<void> {
        const stageStartedAt = performance.now();
        let collection: TestCollectionAdapter;

        try {
            collection = await this._readTests();
        } catch (error) {
            if (!isNoTestsFoundError(error)) {
                throw error;
            }

            collection = {tests: [], hasFocusedTests: Boolean(this._toolAdapter.hasFocusedTestsInLastRead)};
        }
        logWatchPerformance(performanceId, 'read all tests for focused collection', stageStartedAt, {tests: collection.tests.length});

        onChanged(true);
        await this._replaceTestsFromFullCollection(collection);
        onUpdated({replacement: this.tree as ToolRunnerTree});
        logWatchPerformance(performanceId, 'total', totalStartedAt);
    }

    private async _replaceTestsFromFullCollection(collection: TestCollectionAdapter): Promise<void> {
        const reportBuilder = this._ensureReportBuilder();

        this._setCollection(collection);
        reportBuilder.resetTree();
        this._testAdapters = {};
        this._testAdapterIdsByFile.clear();

        await this._addTestsToTree(collection.tests);
        await this._fillTestsTree(reportBuilder.buildTreeFromCurrentDb());
    }

    private async _applyChangedFiles(
        changedFiles: Set<string>,
        previousTests: TestAdapter[],
        testsToAdd: TestAdapter[],
        performanceId: number
    ): Promise<TreePatch> {
        let stageStartedAt = performance.now();
        const reportBuilder = this._ensureReportBuilder();
        const patchScope = this._createTreePatchScope([...previousTests, ...testsToAdd], reportBuilder.testsTree);
        const reportBuilderState = reportBuilder.snapshotTestsState(patchScope, changedFiles, [...previousTests, ...testsToAdd]);
        const previousTestAdapterIdsByFile = new Map<string, Set<string>>();
        const previousTestAdapters: Record<string, TestAdapter> = {};

        for (const changedFile of changedFiles) {
            const adapterIds = this._testAdapterIdsByFile.get(changedFile);

            if (!adapterIds) {
                continue;
            }

            previousTestAdapterIdsByFile.set(changedFile, new Set(adapterIds));
            for (const adapterId of adapterIds) {
                previousTestAdapters[adapterId] = this._testAdapters[adapterId];
            }
        }
        const previousTree = snapshotTree(reportBuilder.testsTree, patchScope);
        logWatchPerformance(performanceId, 'snapshot previous server tree', stageStartedAt);

        stageStartedAt = performance.now();
        try {
            reportBuilder.removeTestsByFiles([...changedFiles]);
            logWatchPerformance(performanceId, 'remove affected tests from server tree', stageStartedAt, {files: changedFiles.size});

            stageStartedAt = performance.now();
            for (const changedFile of changedFiles) {
                for (const testId of this._testAdapterIdsByFile.get(changedFile) ?? []) {
                    delete this._testAdapters[testId];
                }
                this._testAdapterIdsByFile.delete(changedFile);
            }
            logWatchPerformance(performanceId, 'remove affected test adapters', stageStartedAt, {testsToAdd: testsToAdd.length});

            stageStartedAt = performance.now();
            await this._addTestsToTree(testsToAdd);
            logWatchPerformance(performanceId, 'add affected tests to server tree', stageStartedAt);

            stageStartedAt = performance.now();
            const historyRestored = reportBuilder.restoreTestHistory(testsToAdd.map(test => ({
                suitePath: test.titlePath,
                browserId: test.browserId
            })));
            logWatchPerformance(performanceId, 'restore affected tests history', stageStartedAt);

            if (historyRestored) {
                stageStartedAt = performance.now();
                await this._addTestsToTree(testsToAdd.filter(test => !test.pending));
                logWatchPerformance(performanceId, 'restore current runnable test states', stageStartedAt);
            }

            stageStartedAt = performance.now();
            reportBuilder.sortTestsTreeBranches(patchScope.suites);
            logWatchPerformance(performanceId, 'sort affected tree branches', stageStartedAt, {suites: patchScope.suites.size});

            stageStartedAt = performance.now();
            this._extendTreePatchScope(patchScope, testsToAdd, reportBuilder.testsTree);
            const patch = createTreePatch(previousTree, reportBuilder.testsTree, patchScope);
            logWatchPerformance(performanceId, 'create tree patch', stageStartedAt, {
                suites: Object.keys(patch.suites.byId).length,
                browsers: Object.keys(patch.browsers.byId).length,
                results: Object.keys(patch.results.byId).length,
                images: Object.keys(patch.images.byId).length
            });

            return patch;
        } catch (error) {
            reportBuilder.restoreTestsState(reportBuilderState);
            for (const changedFile of changedFiles) {
                for (const adapterId of this._testAdapterIdsByFile.get(changedFile) ?? []) {
                    delete this._testAdapters[adapterId];
                }
                this._testAdapterIdsByFile.delete(changedFile);
            }
            Object.assign(this._testAdapters, previousTestAdapters);
            for (const [changedFile, adapterIds] of previousTestAdapterIdsByFile) {
                this._testAdapterIdsByFile.set(changedFile, adapterIds);
            }
            throw error;
        }
    }

    private _createTreePatchScope(tests: TestAdapter[], tree: Tree): TreePatchScope {
        const scope: TreePatchScope = {
            suites: new Set(),
            browsers: new Set(),
            results: new Set(),
            images: new Set()
        };

        this._extendTreePatchScope(scope, tests, tree);

        return scope;
    }

    private _extendTreePatchScope(scope: TreePatchScope, tests: TestAdapter[], tree: Tree): void {
        for (const test of tests) {
            for (let depth = 1; depth <= test.titlePath.length; depth++) {
                scope.suites.add(test.titlePath.slice(0, depth).join(DEFAULT_TITLE_DELIMITER));
            }

            const suiteId = test.titlePath.join(DEFAULT_TITLE_DELIMITER);
            const browserId = [suiteId, test.browserId].join(DEFAULT_TITLE_DELIMITER);
            const browser = tree.browsers.byId[browserId];
            scope.browsers.add(browserId);

            for (const resultId of browser?.resultIds ?? []) {
                scope.results.add(resultId);
                tree.results.byId[resultId]?.imageIds.forEach(imageId => scope.images.add(imageId));
            }
        }
    }

    private _setCollection(collection: TestCollectionAdapter): void {
        this._collection = collection;
        this._collectionNeedsFullRead = false;
        this._testsByFile.clear();
        this._testFileBySpec.clear();

        for (const test of collection.tests) {
            if (!test.file) {
                continue;
            }
            const testFile = path.resolve(test.file);
            const tests = this._testsByFile.get(testFile) ?? [];

            tests.push(test);
            this._testsByFile.set(testFile, tests);
            this._testFileBySpec.set(this._getTestSpecKey(test.browserId, test.fullName), testFile);
        }
    }

    private _getTestsAfterReplacement(affectedFiles: Set<string>, testsToAdd: TestAdapter[]): TestAdapter[] {
        const testsToRemove = new Set([...affectedFiles].flatMap(file => this._testsByFile.get(file) ?? []));

        return [
            ...this._ensureTestCollection().tests.filter(test => !testsToRemove.has(test)),
            ...testsToAdd
        ];
    }

    private _replaceTestsInCollection(affectedFiles: Set<string>, testsToAdd: TestAdapter[], nextTests: TestAdapter[]): void {
        for (const affectedFile of affectedFiles) {
            for (const test of this._testsByFile.get(affectedFile) ?? []) {
                this._testFileBySpec.delete(this._getTestSpecKey(test.browserId, test.fullName));
            }
            this._testsByFile.delete(affectedFile);
        }

        for (const test of testsToAdd) {
            if (!test.file) {
                continue;
            }

            const testFile = path.resolve(test.file);
            const tests = this._testsByFile.get(testFile) ?? [];

            tests.push(test);
            this._testsByFile.set(testFile, tests);
            this._testFileBySpec.set(this._getTestSpecKey(test.browserId, test.fullName), testFile);
        }

        this._collection = {tests: nextTests};
        this._collectionNeedsFullRead = true;
    }

    private _validateChangedTestsUnique(affectedFiles: Set<string>, tests: TestAdapter[]): void {
        const changedTestsByFullName = new Map<string, TestAdapter>();

        for (const test of tests) {
            const key = this._getTestSpecKey(test.browserId, test.fullName);
            const duplicate = changedTestsByFullName.get(key);
            const existingFile = this._testFileBySpec.get(key);

            if (duplicate) {
                throw this._createDuplicateTestError(test.fullName, duplicate.file, test.file);
            }
            if (existingFile && !affectedFiles.has(existingFile)) {
                throw this._createDuplicateTestError(test.fullName, existingFile, test.file);
            }

            changedTestsByFullName.set(key, test);
        }
    }

    private _validateUniqueFullNames(tests: TestAdapter[]): void {
        const testsByFullName = new Map<string, TestAdapter>();

        for (const test of tests) {
            const key = this._getTestSpecKey(test.browserId, test.fullName);
            const duplicate = testsByFullName.get(key);

            if (duplicate) {
                throw this._createDuplicateTestError(test.fullName, duplicate.file, test.file);
            }
            testsByFullName.set(key, test);
        }
    }

    private _createDuplicateTestError(fullName: string, firstFile: string, secondFile: string): Error {
        return new Error(`Tests with the same title '${fullName}' in files '${path.relative(process.cwd(), firstFile)}' and '${path.relative(process.cwd(), secondFile)}' can't be used`);
    }

    private _getTestSpecKey(browserId: string, fullName: string): string {
        return JSON.stringify([browserId, fullName]);
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
            const assertViewResults = this._prepareAssertViewResults(test.imagesInfo, testAdapter);
            const {sessionId, url} = test.metaInfo as {sessionId?: string; url?: string};

            const latestAttempt = reportBuilder.getLatestAttempt({
                fullName: testAdapter.fullName,
                browserId: testAdapter.browserId
            });

            const latestResult = testAdapter.createTestResult({
                assertViewResults,
                status: UPDATED,
                attempt: latestAttempt,
                error: test.error,
                sessionId,
                meta: {url},
                duration: 0
            });

            const estimatedStatus = reportBuilder.getUpdatedReferenceTestStatus(latestResult);

            const formattedResultWithoutAttempt = testAdapter.createTestResult({
                assertViewResults,
                status: UPDATED,
                attempt: UNKNOWN_ATTEMPT,
                error: test.error,
                sessionId,
                meta: {url},
                duration: 0
            });

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
            const testAdapter = this._getTestAdapterById(test);
            const assertViewResults = this._prepareAssertViewResults(test.imagesInfo, testAdapter);
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

    async run(tests: TestSpec[] = [], runParams: RunParams = {retry: true}): Promise<boolean> {
        let testCollection = this._ensureTestCollection();

        if (this._collectionNeedsFullRead) {
            const startedAt = performance.now();
            const selectedTestFiles = tests.length
                ? _.uniq(tests.map(test => this._testFileBySpec.get(this._getTestSpecKey(test.browserName, test.testName))).filter((file): file is string => Boolean(file)))
                : this._testFiles;
            const testFiles = tests.length && !selectedTestFiles.length ? this._testFiles : selectedTestFiles;

            testCollection = await this._toolAdapter.readTests(testFiles, this._globalOpts);
            if (!tests.length) {
                this._setCollection(testCollection);
            }
            logger.log(`[watch-perf][server][run] refresh executable test collection: ${(performance.now() - startedAt).toFixed(1)}ms ${JSON.stringify({files: testFiles.length, tests: testCollection.tests.length})}`);
        }

        const shouldRunAllTests = _.isEmpty(tests);

        // if tests are not passed, then run all tests with all available retries
        // if tests are specified, then retry only passed tests without retries
        return (shouldRunAllTests && runParams.retry)
            ? this._toolAdapter.run(testCollection, tests, this._globalOpts)
            : this._toolAdapter.runWithoutRetries(testCollection, tests, this._globalOpts);
    }

    protected async _handleRunnableCollection(): Promise<void> {
        await this._addTestsToTree(this._ensureTestCollection().tests);
        await this._fillTestsTree();
    }

    private async _addTestsToTree(tests: TestAdapter[]): Promise<void> {
        const reportBuilder = this._ensureReportBuilder();
        const queue = new PQueue({concurrency: os.cpus().length});

        for (const test of tests) {
            if (test.disabled || test.silentlySkipped) {
                continue;
            }

            // TODO: remove toString after publish major version
            const testId = formatId(test.id.toString(), test.browserId);
            this._testAdapters[testId] = test;
            if (test.file) {
                const testFile = path.resolve(test.file);
                const adapterIds = this._testAdapterIdsByFile.get(testFile) ?? new Set<string>();
                adapterIds.add(testId);
                this._testAdapterIdsByFile.set(testFile, adapterIds);
            }

            if (test.pending) {
                queue.add(async () => reportBuilder.addTestResult(test.createTestResult({status: SKIPPED, duration: 0})));
            } else {
                queue.add(async () => reportBuilder.addTestResult(test.createTestResult({status: IDLE, duration: 0})));
            }
        }

        await queue.onIdle();
    }

    protected _getTestAdapterById(updateData: TestRefUpdateData): TestAdapter {
        const fullTitle = mkFullTitle(updateData);
        const testId = this._toolAdapter.toolName === ToolName.Testplane
            ? formatId(getShortMD5(fullTitle), updateData.browserId)
            : formatId(fullTitle, updateData.browserId);

        return this._testAdapters[testId];
    }

    protected _prepareAssertViewResults(imagesInfo: TestRefUpdateData['imagesInfo'], testAdapter: TestAdapter): AssertViewResult[] {
        const assertViewResults: AssertViewResult[] = [];

        imagesInfo
            .filter(({stateName, actualImg}) => Boolean(stateName) && Boolean(actualImg))
            .forEach((imageInfo) => {
                const {stateName, actualImg} = imageInfo as {stateName: string, actualImg: ImageFile};
                const absoluteRefImgPath = this._toolAdapter.config.getScreenshotPath(testAdapter, stateName);
                const relativeRefImgPath = absoluteRefImgPath && path.relative(process.cwd(), absoluteRefImgPath);
                const refImg: RefImageFile = {path: absoluteRefImgPath, relativePath: relativeRefImgPath, size: actualImg.size};

                assertViewResults.push({stateName, refImg, currImg: actualImg, isUpdated: isUpdatedStatus(imageInfo.status)});
            });

        return assertViewResults;
    }

    protected _handleReferenceUpdate(testResult: ReporterTestResult, imageInfo: ImageInfoUpdated, state: string): void {
        this._expectedImagesCache.set([testResult, imageInfo.stateName], imageInfo.expectedImg.path);

        this._toolAdapter.updateReference({refImg: imageInfo.refImg, state});
    }

    async _fillTestsTree(tree?: Tree): Promise<void> {
        const reportBuilder = this._ensureReportBuilder();

        const {autoRun} = this._guiOpts;
        const testsTree = tree ?? await this._loadDataFromDatabase();

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
