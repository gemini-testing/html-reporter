'use strict';

const _ = require('lodash');
const path = require('path');

const {StaticReportBuilder} = require('./static');
const GuiTestsTreeBuilder = require('../tests-tree-builder/gui');
const {IDLE, RUNNING, SKIPPED, FAIL, SUCCESS, UPDATED} = require('../constants/test-statuses');
const {hasResultFails, hasNoRefImageErrors} = require('../static/modules/utils');
const {isSkippedStatus, isUpdatedStatus} = require('../common-utils');
const {getConfigForStaticFile, deleteFile} = require('../server-utils');
const {DB_COLUMNS} = require('../constants/database');

module.exports = class GuiReportBuilder extends StaticReportBuilder {
    static create(...args) {
        return new this(...args);
    }

    constructor(...args) {
        super(...args);

        this._testsTree = GuiTestsTreeBuilder.create();
        this._skips = [];
        this._apiValues = {};
    }

    addIdle(result) {
        return this._addTestResult(result, {status: IDLE});
    }

    addRunning(result) {
        return this._addTestResult(result, {status: RUNNING});
    }

    addSkipped(result) {
        const formattedResult = super.addSkipped(result);
        const {
            fullName: suite,
            skipReason: comment,
            browserId: browser
        } = formattedResult;

        this._skips.push({suite, browser, comment});
    }

    addUpdated(result, failResultId) {
        return this._addTestResult(result, {status: UPDATED}, {failResultId});
    }

    setApiValues(values) {
        this._apiValues = values;

        return this;
    }

    reuseTestsTree(testsTree) {
        this._testsTree.reuseTestsTree(testsTree);
    }

    getResult() {
        const {customGui} = this._pluginConfig;
        const config = {...getConfigForStaticFile(this._pluginConfig), customGui};

        this._testsTree.sortTree();

        return {
            tree: this._testsTree.tree,
            skips: this._skips,
            config,
            date: new Date().toString(),
            apiValues: this._apiValues
        };
    }

    getTestBranch(id) {
        return this._testsTree.getTestBranch(id);
    }

    getTestsDataToUpdateRefs(imageIds) {
        return this._testsTree.getTestsDataToUpdateRefs(imageIds);
    }

    getImageDataToFindEqualDiffs(imageId) {
        return this._testsTree.getImageDataToFindEqualDiffs(imageId);
    }

    getCurrAttempt(formattedResult) {
        const {status, attempt} = this._testsTree.getLastResult(formattedResult);

        return [IDLE, RUNNING, SKIPPED].includes(status) ? attempt : attempt + 1;
    }

    getUpdatedAttempt(formattedResult) {
        const {attempt} = this._testsTree.getLastResult(formattedResult);
        const imagesInfo = this._testsTree.getImagesInfo(formattedResult.id);
        const isUpdated = imagesInfo.some((image) => image.status === UPDATED);

        return isUpdated ? attempt : attempt + 1;
    }

    async undoAcceptImage(formattedResult, stateName) {
        const resultId = formattedResult.id;
        const suitePath = formattedResult.testPath;
        const browserName = formattedResult.browserId;
        const {
            imageId,
            status,
            timestamp,
            previousImage,
            shouldRemoveResult
        } = this._testsTree.getResultDataToUnacceptImage(resultId, stateName);

        if (!isUpdatedStatus(status)) {
            return {};
        }

        const previousExpectedPath = _.get(previousImage, 'expectedImg.path', null);
        const shouldRemoveReference = _.isNull(previousImage.refImg.size);
        const shouldRevertReference = !shouldRemoveReference;

        let updatedImage, removedResult;

        if (shouldRemoveResult) {
            this._testsTree.removeTestResult(resultId);
            formattedResult.decreaseAttemptNumber();

            removedResult = resultId;
        } else {
            updatedImage = this._testsTree.updateImageInfo(imageId, previousImage);
        }

        this._deleteTestResultFromDb({where: [
            `${DB_COLUMNS.SUITE_PATH} = ?`,
            `${DB_COLUMNS.NAME} = ?`,
            `${DB_COLUMNS.STATUS} = ?`,
            `${DB_COLUMNS.TIMESTAMP} = ?`,
            `json_extract(${DB_COLUMNS.IMAGES_INFO}, '$[0].stateName') = ?`
        ].join(' AND ')}, JSON.stringify(suitePath), browserName, status, timestamp, stateName);

        return {updatedImage, removedResult, previousExpectedPath, shouldRemoveReference, shouldRevertReference};
    }

    _addTestResult(formattedResult, props, opts = {}) {
        super._addTestResult(formattedResult, props);

        const testResult = this._createTestResult(formattedResult, {...props, attempt: formattedResult.attempt});

        this._extendTestWithImagePaths(testResult, formattedResult, opts);

        if (![IDLE, RUNNING].includes(testResult.status)) {
            this._updateTestResultStatus(testResult, formattedResult);
        }

        this._testsTree.addTestResult(testResult, formattedResult);

        return formattedResult;
    }

    _updateTestResultStatus(testResult, formattedResult) {
        if (!hasResultFails(testResult) && !isSkippedStatus(testResult.status)) {
            testResult.status = SUCCESS;
            return;
        }

        if (hasNoRefImageErrors(formattedResult)) {
            testResult.status = FAIL;
            return;
        }

        if (testResult.status === UPDATED) {
            const {status: prevStatus} = this._testsTree.getResultByOrigAttempt(formattedResult);
            testResult.status = prevStatus;
        }
    }

    _extendTestWithImagePaths(test, formattedResult, opts = {}) {
        const newImagesInfo = formattedResult.imagesInfo;

        if (test.status !== UPDATED) {
            return _.set(test, 'imagesInfo', newImagesInfo);
        }

        const failImagesInfo = this._testsTree.getImagesInfo(opts.failResultId);

        if (failImagesInfo.length) {
            test.imagesInfo = _.clone(failImagesInfo);

            newImagesInfo.forEach((imageInfo) => {
                const {stateName} = imageInfo;
                let index = _.findIndex(test.imagesInfo, {stateName});
                index = index >= 0 ? index : _.findLastIndex(test.imagesInfo);
                test.imagesInfo[index] = imageInfo;
            });
        }
    }

    async _removeImageFromReport(reportPath, imgPath) {
        const imageAbsolutePath = path.resolve(process.cwd(), reportPath, imgPath);

        await deleteFile(imageAbsolutePath);
    }
};
