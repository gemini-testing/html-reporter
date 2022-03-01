'use strict';

const _ = require('lodash');
const path = require('path');
const fs = require('fs-extra');

const {IDLE, RUNNING, SKIPPED, FAIL, ERROR, SUCCESS} = require('../constants/test-statuses');
const {LOCAL_DATABASE_NAME} = require('../constants/database');
const SqliteAdapter = require('../sqlite-adapter');
const TestAdapter = require('../test-adapter');
const {hasNoRefImageErrors} = require('../static/modules/utils');
const {hasImage, saveStaticFilesToReportDir, writeDatabaseUrlsFile} = require('../server-utils');

const ignoredStatuses = [RUNNING, IDLE];

module.exports = class StaticReportBuilder {
    static create(...args) {
        return new this(...args);
    }

    constructor(hermione, pluginConfig, {reuse = false} = {}) {
        this._hermione = hermione;
        this._pluginConfig = pluginConfig;

        this._sqliteAdapter = SqliteAdapter.create({
            hermione: this._hermione,
            reportPath: this._pluginConfig.path,
            reuse
        });
    }

    async init() {
        await this._sqliteAdapter.init();
    }

    format(result, status) {
        result.timestamp = Date.now();

        return result instanceof TestAdapter
            ? result
            : TestAdapter.create(result, this._hermione, this._pluginConfig, status);
    }

    async saveStaticFiles() {
        const destPath = this._pluginConfig.path;

        await Promise.all(
            [
                saveStaticFilesToReportDir(this._hermione, this._pluginConfig, destPath),
                writeDatabaseUrlsFile(destPath, [LOCAL_DATABASE_NAME])
            ]
        );
    }

    addSkipped(result) {
        const formattedResult = this.format(result);

        return this._addTestResult(formattedResult, {
            status: SKIPPED,
            skipReason: formattedResult.suite.skipComment
        });
    }

    addSuccess(result) {
        return this._addTestResult(this.format(result), {status: SUCCESS});
    }

    addFail(result) {
        return this._addFailResult(this.format(result));
    }

    addError(result) {
        return this._addErrorResult(this.format(result));
    }

    addRetry(result) {
        const formattedResult = this.format(result);

        if (formattedResult.hasDiff()) {
            return this._addFailResult(formattedResult);
        } else {
            return this._addErrorResult(formattedResult);
        }
    }

    _addFailResult(formattedResult) {
        return this._addTestResult(formattedResult, {status: FAIL});
    }

    _addErrorResult(formattedResult) {
        return this._addTestResult(formattedResult, {status: ERROR, error: formattedResult.error});
    }

    _addTestResult(formattedResult, props) {
        formattedResult.image = hasImage(formattedResult);

        const testResult = this._createTestResult(formattedResult, _.extend(props, {
            timestamp: formattedResult.timestamp
        }));

        if (hasNoRefImageErrors(formattedResult)) {
            testResult.status = FAIL;
        }

        if (!ignoredStatuses.includes(testResult.status)) {
            this._writeTestResultToDb(testResult, formattedResult);
        }

        return formattedResult;
    }

    _createTestResult(result, props) {
        const {
            browserId, suite, sessionId, description, imagesInfo, screenshot, multipleTabs, errorDetails
        } = result;

        const {baseHost, saveErrorDetails} = this._pluginConfig;
        const suiteUrl = suite.getUrl({browserId, baseHost});
        const metaInfo = _.merge(_.cloneDeep(result.meta), {url: suite.fullUrl, file: suite.file, sessionId});

        const testResult = Object.assign({
            suiteUrl, name: browserId, metaInfo, description, imagesInfo,
            screenshot: Boolean(screenshot), multipleTabs
        }, props);

        if (saveErrorDetails && errorDetails) {
            testResult.errorDetails = _.pick(errorDetails, ['title', 'filePath']);
        }

        return testResult;
    }

    _writeTestResultToDb(testResult, formattedResult) {
        const {suite} = formattedResult;
        const suiteName = formattedResult.state.name;
        const suitePath = suite.path.concat(suiteName);

        this._sqliteAdapter.write({testResult, suitePath, suiteName});
    }

    async finalize() {
        this._sqliteAdapter.close();

        const reportsSaver = this._hermione.htmlReporter.reportsSaver;

        if (reportsSaver) {
            const reportDir = this._pluginConfig.path;
            const src = path.join(reportDir, LOCAL_DATABASE_NAME);
            const dbPath = await reportsSaver.saveReportData(src, {destPath: LOCAL_DATABASE_NAME, reportDir: reportDir});
            await writeDatabaseUrlsFile(reportDir, [dbPath]);
            await fs.remove(src);
        }
    }
};
