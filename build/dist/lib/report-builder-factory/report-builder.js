'use strict';
var path = require('path');
var Promise = require('bluebird');
var _ = require('lodash');
var fs = require('fs-extra');
var _a = require('../constants/test-statuses'), IDLE = _a.IDLE, RUNNING = _a.RUNNING, SUCCESS = _a.SUCCESS, FAIL = _a.FAIL, ERROR = _a.ERROR, SKIPPED = _a.SKIPPED, UPDATED = _a.UPDATED;
var _b = require('../server-utils'), logger = _b.logger, getPathsFor = _b.getPathsFor, hasImage = _b.hasImage, prepareCommonJSData = _b.prepareCommonJSData;
var _c = require('../static/modules/utils'), setStatusForBranch = _c.setStatusForBranch, hasFails = _c.hasFails, hasNoRefImageErrors = _c.hasNoRefImageErrors;
var NO_STATE = 'NO_STATE';
module.exports = /** @class */ (function () {
    function ReportBuilder(tool, pluginConfig, TestAdapter) {
        this._tree = { name: 'root' };
        this._skips = [];
        this._tool = tool;
        this._pluginConfig = pluginConfig;
        this._TestAdapter = TestAdapter;
    }
    ReportBuilder.create = function (tool, pluginConfig, TestAdapter) {
        return new ReportBuilder(tool, pluginConfig, TestAdapter);
    };
    ReportBuilder.prototype.format = function (result) {
        return this._TestAdapter.create(result, this._tool);
    };
    ReportBuilder.prototype.addIdle = function (result) {
        return this._addTestResult(this.format(result), { status: IDLE });
    };
    ReportBuilder.prototype.addSkipped = function (result) {
        var formattedResult = this.format(result);
        var _a = formattedResult.suite, comment = _a.skipComment, suite = _a.fullName, browser = formattedResult.browserId;
        this._skips.push({ suite: suite, browser: browser, comment: comment });
        return this._addTestResult(formattedResult, {
            status: SKIPPED,
            reason: comment
        });
    };
    ReportBuilder.prototype.addSuccess = function (result) {
        return this._addSuccessResult(this.format(result), SUCCESS);
    };
    ReportBuilder.prototype.addUpdated = function (result) {
        var formattedResult = this.format(result);
        formattedResult.imagesInfo = (result.imagesInfo || []).map(function (imageInfo) {
            var stateName = imageInfo.stateName;
            return _.extend(imageInfo, getPathsFor(UPDATED, formattedResult, stateName));
        });
        return this._addSuccessResult(formattedResult, UPDATED);
    };
    ReportBuilder.prototype._addSuccessResult = function (formattedResult, status) {
        return this._addTestResult(formattedResult, { status: status });
    };
    ReportBuilder.prototype.addFail = function (result) {
        return this._addFailResult(this.format(result));
    };
    ReportBuilder.prototype._addFailResult = function (formattedResult) {
        return this._addTestResult(formattedResult, { status: FAIL });
    };
    ReportBuilder.prototype.addError = function (result) {
        return this._addErrorResult(this.format(result));
    };
    ReportBuilder.prototype._addErrorResult = function (formattedResult) {
        return this._addTestResult(formattedResult, {
            status: ERROR,
            reason: formattedResult.error
        });
    };
    ReportBuilder.prototype.addRetry = function (result) {
        var formattedResult = this.format(result);
        if (formattedResult.hasDiff()) {
            return this._addFailResult(formattedResult);
        }
        else {
            return this._addErrorResult(formattedResult);
        }
    };
    ReportBuilder.prototype.setStats = function (stats) {
        this._stats = stats;
        return this;
    };
    ReportBuilder.prototype._createTestResult = function (result, props) {
        var browserId = result.browserId, suite = result.suite, sessionId = result.sessionId, description = result.description, imagesInfo = result.imagesInfo, screenshot = result.screenshot, multipleTabs = result.multipleTabs;
        var baseHost = this._pluginConfig.baseHost;
        var suiteUrl = suite.getUrl({ browserId: browserId, baseHost: baseHost });
        var metaInfo = _.merge(result.meta, { url: suite.fullUrl, file: suite.file, sessionId: sessionId });
        return Object.assign({
            suiteUrl: suiteUrl, name: browserId, metaInfo: metaInfo, description: description, imagesInfo: imagesInfo,
            screenshot: Boolean(screenshot), multipleTabs: multipleTabs
        }, props);
    };
    ReportBuilder.prototype._addTestResult = function (formattedResult, props) {
        var testResult = this._createTestResult(formattedResult, _.extend(props, { attempt: 0 }));
        var suite = formattedResult.suite, browserId = formattedResult.browserId;
        var suitePath = suite.path.concat(formattedResult.state ? formattedResult.state.name : NO_STATE);
        var node = findOrCreate(this._tree, suitePath, testResult.status);
        node.browsers = Array.isArray(node.browsers) ? node.browsers : [];
        var existing = _.findIndex(node.browsers, { name: browserId });
        if (existing === -1) {
            formattedResult.attempt = testResult.attempt;
            formattedResult.image = hasImage(formattedResult);
            extendTestWithImagePaths(testResult, formattedResult);
            if (hasNoRefImageErrors(formattedResult)) {
                testResult.status = FAIL;
            }
            node.browsers.push({ name: browserId, result: testResult, retries: [] });
            setStatusForBranch(this._tree, node.suitePath, testResult.status);
            return formattedResult;
        }
        var stateInBrowser = node.browsers[existing];
        var previousResult = _.cloneDeep(stateInBrowser.result);
        var statuses = [SKIPPED, RUNNING, IDLE];
        if (!statuses.includes(previousResult.status)) {
            testResult.attempt = testResult.status === UPDATED
                ? formattedResult.attempt
                : previousResult.attempt + 1;
            if (testResult.status !== UPDATED) {
                stateInBrowser.retries.push(previousResult);
            }
        }
        formattedResult.attempt = testResult.attempt;
        formattedResult.image = hasImage(formattedResult);
        var _a = stateInBrowser.result, imagesInfo = _a.imagesInfo, currentStatus = _a.status;
        stateInBrowser.result = extendTestWithImagePaths(testResult, formattedResult, imagesInfo);
        if (!hasFails(stateInBrowser)) {
            stateInBrowser.result.status = SUCCESS;
        }
        else if (hasNoRefImageErrors(stateInBrowser.result)) {
            stateInBrowser.result.status = FAIL;
        }
        else if (stateInBrowser.result.status === UPDATED) {
            stateInBrowser.result.status = currentStatus;
        }
        setStatusForBranch(this._tree, node.suitePath, testResult.status);
        return formattedResult;
    };
    ReportBuilder.prototype.save = function () {
        var _this = this;
        return this.saveDataFileAsync()
            .then(function () { return _this._copyToReportDir(['index.html', 'report.min.js', 'report.min.css']); })
            .then(function () { return _this; })
            .catch(function (e) { return logger.warn(e.message || e); });
    };
    ReportBuilder.prototype.saveDataFileAsync = function () {
        var _this = this;
        return fs.mkdirsAsync(this._pluginConfig.path)
            .then(function () { return _this._saveDataFile(fs.writeFileAsync); });
    };
    ReportBuilder.prototype.saveDataFileSync = function () {
        fs.mkdirsSync(this._pluginConfig.path);
        this._saveDataFile(fs.writeFileSync);
    };
    ReportBuilder.prototype._saveDataFile = function (saveFn) {
        return saveFn(path.join(this._pluginConfig.path, 'data.js'), prepareCommonJSData(this.getResult()), 'utf8');
    };
    ReportBuilder.prototype.getResult = function () {
        var _a = this._pluginConfig, defaultView = _a.defaultView, baseHost = _a.baseHost, scaleImages = _a.scaleImages, lazyLoadOffset = _a.lazyLoadOffset;
        return _.extend({
            skips: _.uniq(this._skips, JSON.stringify),
            suites: this._tree.children,
            config: { defaultView: defaultView, baseHost: baseHost, scaleImages: scaleImages, lazyLoadOffset: lazyLoadOffset }
        }, this._stats);
    };
    ReportBuilder.prototype.getSuites = function () {
        return this._tree.children;
    };
    ReportBuilder.prototype._copyToReportDir = function (files) {
        var _this = this;
        return Promise.map(files, function (fileName) {
            var from = path.resolve(__dirname, '../static', fileName);
            var to = path.join(_this._pluginConfig.path, fileName);
            return fs.copyAsync(from, to);
        });
    };
    Object.defineProperty(ReportBuilder.prototype, "reportPath", {
        get: function () {
            return path.resolve(this._pluginConfig.path + "/index.html");
        },
        enumerable: true,
        configurable: true
    });
    return ReportBuilder;
}());
function findOrCreate(node, statePath) {
    if (statePath.length === 0) {
        return node;
    }
    node.children = Array.isArray(node.children) ? node.children : [];
    var pathPart = statePath.shift();
    node.suitePath = node.suitePath || [];
    if (pathPart === NO_STATE) {
        return node;
    }
    var child = _.find(node.children, { name: pathPart });
    if (!child) {
        child = {
            name: pathPart,
            suitePath: node.suitePath.concat(pathPart)
        };
        node.children.push(child);
    }
    return findOrCreate(child, statePath);
}
function extendTestWithImagePaths(test, formattedResult, oldImagesInfo) {
    if (oldImagesInfo === void 0) { oldImagesInfo = []; }
    var newImagesInfo = formattedResult.getImagesInfo(test.status);
    if (test.status !== UPDATED) {
        return _.set(test, 'imagesInfo', newImagesInfo);
    }
    if (oldImagesInfo.length) {
        test.imagesInfo = oldImagesInfo;
        newImagesInfo.forEach(function (imageInfo) {
            var stateName = imageInfo.stateName;
            var index = _.findIndex(test.imagesInfo, { stateName: stateName });
            test.imagesInfo[index >= 0 ? index : _.findLastIndex(test.imagesInfo)] = imageInfo;
        });
    }
    return test;
}
//# sourceMappingURL=report-builder.js.map