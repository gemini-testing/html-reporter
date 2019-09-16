'use strict';

const path = require('path');
const Promise = require('bluebird');
const _ = require('lodash');
const fs = require('fs-extra');
const {IDLE, SUCCESS, FAIL, ERROR, SKIPPED, UPDATED} = require('../constants/test-statuses');
const {hasImage, logger} = require('../server-utils');
const {hasFails, allSkipped, hasNoRefImageErrors} = require('../static/modules/utils');

const NO_STATE = 'NO_STATE';

module.exports = class ReportBuilderSqlite {
    static create(tool, pluginConfig, TestAdapter, SqliteAdapter) {
        return new ReportBuilderSqlite(tool, pluginConfig, TestAdapter, SqliteAdapter);
    }

    constructor(tool, pluginConfig, TestAdapter, SqliteAdapter) {
        this._tree = {name: 'root'};
        this._skips = [];
        this._tool = tool;
        this._apiValues = {};
        this._pluginConfig = pluginConfig;
        this._TestAdapter = TestAdapter;
        this._sqlite = SqliteAdapter;
    }

    format(result, status) {
        return result instanceof this._TestAdapter
            ? result
            : this._TestAdapter.create(result, this._tool, status, true);
    }

    addIdle(result) {
        return this._addTestResult(this.format(result, IDLE), {status: IDLE});
    }

    addSkipped(result) {
        const formattedResult = this.format(result);

        const {
            suite: {
                skipComment: comment,
                fullName: suite
            },
            browserId: browser
        } = formattedResult;

        this._skips.push({suite, browser, comment});

        return this._addTestResult(formattedResult, {
            status: SKIPPED,
            skipReason: comment
        });
    }

    addSuccess(result) {
        return this._addSuccessResult(this.format(result), SUCCESS);
    }

    addUpdated(result) {
        const formattedResult = this.format(result, UPDATED);

        formattedResult.imagesInfo = (result.imagesInfo || []).map((imageInfo) => {
            const {stateName} = imageInfo;

            return _.extend(imageInfo, formattedResult.getImagesFor(UPDATED, stateName));
        });

        return this._addSuccessResult(formattedResult, UPDATED);
    }

    _addSuccessResult(formattedResult, status) {
        return this._addTestResult(formattedResult, {status});
    }

    addFail(result) {
        return this._addFailResult(this.format(result));
    }

    _addFailResult(formattedResult) {
        return this._addTestResult(formattedResult, {status: FAIL});
    }

    addError(result) {
        return this._addErrorResult(this.format(result));
    }

    _addErrorResult(formattedResult) {
        return this._addTestResult(formattedResult, {
            status: ERROR,
            error: formattedResult.error
        });
    }

    addRetry(result) {
        const formattedResult = this.format(result);

        if (formattedResult.hasDiff()) {
            return this._addFailResult(formattedResult);
        } else {
            return this._addErrorResult(formattedResult);
        }
    }

    setStats(stats) {
        this._stats = stats;

        return this;
    }

    setApiValues(values) {
        this._apiValues = values;

        return this;
    }

    _createTestResult(result, props) {
        const {browserId, suite, sessionId, description, imagesInfo, screenshot, multipleTabs} = result;
        const {baseHost} = this._pluginConfig;
        const suiteUrl = suite.getUrl({browserId, baseHost});
        const metaInfo = _.merge(_.cloneDeep(result.meta), {url: suite.fullUrl, file: suite.file, sessionId});

        return Object.assign({
            suiteUrl, name: browserId, metaInfo, description, imagesInfo,
            screenshot: Boolean(screenshot), multipleTabs
        }, props);
    }


    // getCurrAttempt(formattedResult) {
    //     const previousResult = this._getPreviousResult({ formattedResult });
    //     return shouldUpdateAttempt(previousResult.status) ? previousResult.attempt + 1 : previousResult.attempt;
    // }

    _addTestResult(formattedResult, props) {
        console.log('!!!! adding test result to sqlite');

        const testResult = this._createTestResult(formattedResult, _.extend(props, {attempt: formattedResult.attempt}));

        formattedResult.image = hasImage(formattedResult);

        this._writeTestResultToDb(testResult, formattedResult);
        return formattedResult;

    }

    _writeTestResultToDb(testResult, formattedResult) {
        const {suite} = formattedResult;
        const suitePath = suite.path.concat(formattedResult.state ? formattedResult.state.name : NO_STATE);
        const suiteName = formattedResult.state ? formattedResult.state.name : NO_STATE;
        this._sqlite.write({testResult, suitePath, suiteName});
    }


    _setResultStatus(stateInBrowser, currentStatus) {
        if (!hasFails(stateInBrowser) && !allSkipped(stateInBrowser)) {
            stateInBrowser.result.status = SUCCESS;
        } else if (hasNoRefImageErrors(stateInBrowser.result)) {
            stateInBrowser.result.status = FAIL;
        } else if (stateInBrowser.result.status === UPDATED) {
            stateInBrowser.result.status = currentStatus;
        }
    }

    save() {
        this._sqlite.close();
        return () => this._copyToReportDir(['index.html', 'report.min.js', 'report.min.css'])
            .then(() => this)
            .catch((e) => logger.warn(e.message || e));
    }

    _copyToReportDir(files) {
        return Promise.map(files, (fileName) => {
            const from = path.resolve(__dirname, '../static', fileName);
            const to = path.join(this._pluginConfig.path, fileName);

            return fs.copy(from, to);
        });
    }

};



