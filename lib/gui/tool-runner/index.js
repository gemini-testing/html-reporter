'use strict';

const _ = require('lodash');
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const Promise = require('bluebird');
const looksSame = require('looks-same');

const Runner = require('./runner');
const subscribeOnToolEvents = require('./report-subscriber');
const {GuiReportBuilder} = require('../../report-builder/gui');
const EventSource = require('../event-source');
const {logger} = require('../../common-utils');
const reporterHelper = require('../../reporter-helpers');
const {UPDATED, SKIPPED, IDLE} = require('../../constants/test-statuses');
const {DATABASE_URLS_JSON_NAME, LOCAL_DATABASE_NAME} = require('../../constants/database');
const {getShortMD5} = require('../../common-utils');
const {formatId, mkFullTitle, mergeDatabasesForReuse, filterByEqualDiffSizes} = require('./utils');
const {getTestsTreeFromDatabase} = require('../../db-utils/server');
const {formatTestResult} = require('../../server-utils');
const {ToolName} = require('../../constants');

module.exports = class ToolRunner {
    static create(paths, hermione, configs) {
        return new this(paths, hermione, configs);
    }

    constructor(paths, hermione, {program: globalOpts, pluginConfig, options: guiOpts}) {
        this._testFiles = [].concat(paths);
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

    get config() {
        return this._hermione.config;
    }

    get tree() {
        return this._tree;
    }

    async initialize() {
        await mergeDatabasesForReuse(this._reportPath);

        this._reportBuilder = GuiReportBuilder.create(this._hermione.htmlReporter, this._pluginConfig, {reuse: true});
        this._subscribeOnEvents();

        this._collection = await this._readTests();

        await this._reportBuilder.init();
        await this._reportBuilder.saveStaticFiles();

        this._reportBuilder.setApiValues(this._hermione.htmlReporter.values);
        await this._handleRunnableCollection();
    }

    async _readTests() {
        const {grep, set: sets, browser: browsers} = this._globalOpts;

        return await this._hermione.readTests(this._testFiles, {grep, sets, browsers});
    }

    finalize() {
        return this._reportBuilder.finalize();
    }

    addClient(connection) {
        this._eventSource.addConnection(connection);
    }

    sendClientEvent(event, data) {
        this._eventSource.emit(event, data);
    }

    getTestsDataToUpdateRefs(imageIds) {
        return this._reportBuilder.getTestsDataToUpdateRefs(imageIds);
    }

    getImageDataToFindEqualDiffs(imageIds) {
        const [selectedImage, ...comparedImages] = this._reportBuilder.getImageDataToFindEqualDiffs(imageIds);

        const imagesWithEqualBrowserName = comparedImages.filter((image) => image.browserName === selectedImage.browserName);
        const imagesWithEqualDiffSizes = filterByEqualDiffSizes(imagesWithEqualBrowserName, selectedImage.diffClusters);

        return _.isEmpty(imagesWithEqualDiffSizes) ? [] : [selectedImage].concat(imagesWithEqualDiffSizes);
    }

    updateReferenceImage(tests) {
        return Promise.map(tests, (test) => {
            const updateResult = this._prepareTestResult(test);
            const formattedResult = formatTestResult(updateResult, UPDATED, this._reportBuilder);
            const failResultId = formattedResult.id;
            const updateAttempt = this._reportBuilder.getUpdatedAttempt(formattedResult);

            formattedResult.attempt = updateAttempt;
            updateResult.attempt = updateAttempt;

            return Promise.map(updateResult.imagesInfo, (imageInfo) => {
                const {stateName} = imageInfo;

                return reporterHelper.updateReferenceImage(formattedResult, this._reportPath, stateName)
                    .then(() => {
                        const result = _.extend(updateResult, {refImg: imageInfo.expectedImg});
                        this._emitUpdateReference(result, stateName);
                    });
            })
                .then(() => {
                    this._reportBuilder.addUpdated(formatTestResult(updateResult, UPDATED, this._reportBuilder), failResultId);
                    return this._reportBuilder.getTestBranch(formattedResult.id);
                });
        });
    }

    async undoAcceptImages(tests) {
        const updatedImages = [], removedResults = [];

        await Promise.map(tests, async (test) => {
            const updateResult = this._prepareTestResult(test);
            const formattedResult = formatTestResult(updateResult, UPDATED, this._reportBuilder);

            formattedResult.attempt = updateResult.attempt;

            await Promise.map(updateResult.imagesInfo, async (imageInfo) => {
                const {stateName} = imageInfo;
                const {
                    updatedImage,
                    removedResult,
                    previousExpectedPath,
                    shouldRemoveReference,
                    shouldRevertReference
                } = await this._reportBuilder.undoAcceptImage(formattedResult, stateName);

                updatedImage && updatedImages.push(updatedImage);
                removedResult && removedResults.push(removedResult);

                if (shouldRemoveReference) {
                    await reporterHelper.removeReferenceImage(formattedResult, stateName);
                }

                if (shouldRevertReference) {
                    await reporterHelper.revertReferenceImage(formattedResult, stateName);
                }

                if (previousExpectedPath) {
                    this._reportBuilder.imageHandler.updateCacheExpectedPath(updateResult, stateName, previousExpectedPath);
                }
            });
        });

        return {updatedImages, removedResults};
    }

    async findEqualDiffs(images) {
        const [selectedImage, ...comparedImages] = images;
        const {tolerance, antialiasingTolerance} = this.config;
        const compareOpts = {tolerance, antialiasingTolerance, stopOnFirstFail: true, shouldCluster: false};
        const equalImages = await Promise.filter(comparedImages, async (image) => {
            try {
                await Promise.mapSeries(image.diffClusters, async (diffCluster, i) => {
                    const refComparisonRes = await looksSame(
                        {source: this._resolveImgPath(selectedImage.expectedImg.path), boundingBox: selectedImage.diffClusters[i]},
                        {source: this._resolveImgPath(image.expectedImg.path), boundingBox: diffCluster},
                        compareOpts
                    );

                    if (!refComparisonRes.equal) {
                        return Promise.reject(false);
                    }

                    const actComparisonRes = await looksSame(
                        {source: this._resolveImgPath(selectedImage.actualImg.path), boundingBox: selectedImage.diffClusters[i]},
                        {source: this._resolveImgPath(image.actualImg.path), boundingBox: diffCluster},
                        compareOpts
                    );

                    if (!actComparisonRes.equal) {
                        return Promise.reject(false);
                    }
                });

                return true;
            } catch (err) {
                return err === false ? err : Promise.reject(err);
            }
        });

        return equalImages.map((image) => image.id);
    }

    run(tests = []) {
        const {grep, set: sets, browser: browsers} = this._globalOpts;

        return Runner.create(this._collection, tests)
            .run((collection) => this._hermione.run(collection, {grep, sets, browsers}));
    }

    async _handleRunnableCollection() {
        this._collection.eachTest((test, browserId) => {
            if (test.disabled || this._isSilentlySkipped(test)) {
                return;
            }

            // TODO: remove toString after publish major version
            const testId = formatId(test.id.toString(), browserId);
            this._tests[testId] = _.extend(test, {browserId});

            test.pending
                ? this._reportBuilder.addSkipped(formatTestResult(test, SKIPPED, this._reportBuilder))
                : this._reportBuilder.addIdle(formatTestResult(test, IDLE, this._reportBuilder));
        });

        await this._fillTestsTree();
    }

    _isSilentlySkipped({silentSkip, parent}) {
        return silentSkip || parent && this._isSilentlySkipped(parent);
    }

    _subscribeOnEvents() {
        subscribeOnToolEvents(this._hermione, this._reportBuilder, this._eventSource, this._reportPath);
    }

    _prepareTestResult(test) {
        const {browserId, attempt} = test;
        const fullTitle = mkFullTitle(test);
        const testId = formatId(getShortMD5(fullTitle), browserId);
        const rawTest = this._tests[testId];
        const {sessionId, url} = test.metaInfo;
        const assertViewResults = [];

        const imagesInfo = test.imagesInfo.map((imageInfo) => {
            const {stateName, actualImg} = imageInfo;
            const path = this._hermione.config.browsers[browserId].getScreenshotPath(rawTest, stateName);
            const refImg = {path, size: actualImg.size};

            assertViewResults.push({stateName, refImg, currImg: actualImg});

            return _.extend(imageInfo, {expectedImg: refImg});
        });

        const res = _.merge({}, rawTest, {
            assertViewResults,
            imagesInfo,
            sessionId,
            attempt,
            err: test.error,
            meta: {url},
            updated: true
        });

        // _.merge can't fully clone test object since hermione@7+
        // TODO: use separate object to represent test results. Do not extend test object with test results
        return rawTest && rawTest.clone
            ? Object.assign(rawTest.clone(), res)
            : res;
    }

    _emitUpdateReference({refImg}, state) {
        this._hermione.emit(
            this._hermione.events.UPDATE_REFERENCE,
            {refImg, state}
        );
    }

    async _fillTestsTree() {
        const {autoRun} = this._guiOpts;
        const testsTree = await this._loadDataFromDatabase();

        if (!_.isEmpty(testsTree)) {
            this._reportBuilder.reuseTestsTree(testsTree);
        }

        this._tree = {...this._reportBuilder.getResult(), autoRun};
    }

    async _loadDataFromDatabase() {
        const dbPath = path.resolve(this._reportPath, LOCAL_DATABASE_NAME);

        if (await fs.pathExists(dbPath)) {
            return getTestsTreeFromDatabase(ToolName.Hermione, dbPath);
        }

        logger.warn(chalk.yellow(`Nothing to reuse in ${this._reportPath}: can not load data from ${DATABASE_URLS_JSON_NAME}`));

        return {};
    }

    _resolveImgPath(imgPath) {
        return path.resolve(process.cwd(), this._pluginConfig.path, imgPath);
    }
};
