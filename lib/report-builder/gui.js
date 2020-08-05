'use strict';

const _ = require('lodash');
const StaticReportBuilder = require('./static');
const GuiTestsTreeBuilder = require('../tests-tree-builder/gui');
const {IDLE, SKIPPED, FAIL, SUCCESS, UPDATED} = require('../constants/test-statuses');
const {hasFails, allSkipped, hasNoRefImageErrors} = require('../static/modules/utils');
const {getConfigForStaticFile} = require('../server-utils');

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
        return this._addTestResult(this.format(result, IDLE), {status: IDLE});
    }

    addSkipped(result) {
        const formattedResult = super.addSkipped(result);
        const {
            suite: {
                skipComment: comment,
                fullName: suite
            },
            browserId: browser
        } = formattedResult;

        this._skips.push({suite, browser, comment});
    }

    addUpdated(result) {
        const formattedResult = this.format(result, UPDATED);

        formattedResult.imagesInfo = []
            .concat(result.imagesInfo)
            .map((imageInfo) => ({...imageInfo, ...formattedResult.getImagesFor(UPDATED, imageInfo.stateName)}));

        return this._addTestResult(formattedResult, {status: UPDATED});
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
            suites: this._testsTree.convertToOldFormat().suites,
            skips: this._skips,
            config,
            date: new Date().toString(),
            apiValues: this._apiValues
        };
    }

    getSuites() {
        return this._testsTree.convertToOldFormat().suites;
    }

    getCurrAttempt(formattedResult) {
        const {status, attempt} = this._testsTree.getLastResult(formattedResult);

        return [IDLE, SKIPPED].includes(status) ? attempt : attempt + 1;
    }

    _addTestResult(formattedResult, props) {
        super._addTestResult(formattedResult, props);

        const testResult = this._createTestResult(formattedResult, {...props, attempt: formattedResult.attempt});
        this._extendTestWithImagePaths(testResult, formattedResult);

        if (testResult.status !== IDLE) {
            this._updateTestResultStatus(testResult, formattedResult);
        }

        this._testsTree.addTestResult(testResult, formattedResult);

        return formattedResult;
    }

    _updateTestResultStatus(testResult, formattedResult) {
        if (!hasFails({result: testResult}) && !allSkipped({result: testResult})) {
            testResult.status = SUCCESS;
            return;
        }

        if (hasNoRefImageErrors(formattedResult)) {
            testResult.status = FAIL;
            return;
        }

        if (testResult.status === UPDATED) {
            const {status: prevStatus} = this._testsTree.getLastResult(formattedResult);
            testResult.status = prevStatus;
        }
    }

    _extendTestWithImagePaths(test, formattedResult) {
        const newImagesInfo = formattedResult.getImagesInfo(test.status);

        if (test.status !== UPDATED) {
            return _.set(test, 'imagesInfo', newImagesInfo);
        }

        const prevImagesInfo = this._testsTree.getImagesInfo(formattedResult);

        if (prevImagesInfo.length) {
            test.imagesInfo = prevImagesInfo;

            newImagesInfo.forEach((imageInfo) => {
                const {stateName} = imageInfo;
                let index = _.findIndex(test.imagesInfo, {stateName});
                index = index >= 0 ? index : _.findLastIndex(test.imagesInfo);
                test.imagesInfo[index] = imageInfo;
            });
        }
    }
};
