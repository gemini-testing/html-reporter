'use strict';
var path = require('path');
var _ = require('lodash');
var chalk = require('chalk');
var Promise = require('bluebird');
var ReportBuilderFactory = require('../../report-builder-factory');
var EventSource = require('../event-source');
var utils = require('../../server-utils');
var findTestResult = require('./utils').findTestResult;
var findNode = require('../../../lib/static/modules/utils').findNode;
var reporterHelper = require('../../reporter-helpers');
module.exports = /** @class */ (function () {
    function ToolRunner(paths, tool, _a) {
        var globalOpts = _a.program, pluginConfig = _a.pluginConfig, guiOpts = _a.options;
        this._toolName = globalOpts.name();
        this._testFiles = [].concat(paths);
        this._tool = tool;
        this._tree = null;
        this._collection = null;
        this._globalOpts = globalOpts;
        this._guiOpts = guiOpts;
        this._reportPath = pluginConfig.path;
        this._eventSource = new EventSource();
        this._reportBuilder = ReportBuilderFactory.create(this._toolName, tool, pluginConfig);
    }
    ToolRunner.create = function (paths, tool, configs) {
        return new this(paths, tool, configs);
    };
    Object.defineProperty(ToolRunner.prototype, "config", {
        get: function () {
            return this._tool.config;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(ToolRunner.prototype, "tree", {
        get: function () {
            return this._tree;
        },
        enumerable: true,
        configurable: true
    });
    ToolRunner.prototype.initialize = function () {
        var _this = this;
        return this._readTests()
            .then(function (collection) {
            _this._collection = collection;
            _this._handleRunnableCollection();
            _this._subscribeOnEvents();
        });
    };
    ToolRunner.prototype._readTests = function () {
        var _a = this._globalOpts, grep = _a.grep, sets = _a.set, browsers = _a.browser;
        return this._tool.readTests(this._testFiles, { grep: grep, sets: sets, browsers: browsers });
    };
    ToolRunner.prototype.finalize = function () {
        this._reportBuilder.saveDataFileSync();
    };
    ToolRunner.prototype.addClient = function (connection) {
        this._eventSource.addConnection(connection);
    };
    ToolRunner.prototype.sendClientEvent = function (event, data) {
        this._eventSource.emit(event, data);
    };
    ToolRunner.prototype.updateReferenceImage = function (tests) {
        var _this = this;
        var reportBuilder = this._reportBuilder;
        return Promise.map(tests, function (test) {
            var updateResult = _this._prepareUpdateResult(test);
            var formattedResult = reportBuilder.format(updateResult);
            return Promise.map(updateResult.imagesInfo, function (imageInfo) {
                var stateName = imageInfo.stateName;
                return reporterHelper.updateReferenceImage(formattedResult, _this._reportPath, stateName)
                    .then(function () {
                    _this._tool.emit(_this._tool.events.UPDATE_RESULT, _.extend(updateResult, { imagePath: imageInfo.imagePath }));
                });
            }).then(function () {
                reportBuilder.addUpdated(updateResult);
                return findTestResult(reportBuilder.getSuites(), formattedResult.prepareTestResult());
            });
        });
    };
    ToolRunner.prototype._fillTestsTree = function () {
        var autoRun = this._guiOpts.autoRun;
        this._tree = Object.assign(this._reportBuilder.getResult(), { gui: true, autoRun: autoRun });
        this._tree.suites = this._applyReuseData(this._tree.suites);
    };
    ToolRunner.prototype._applyReuseData = function (testSuites) {
        if (!testSuites) {
            return;
        }
        var reuseData = this._loadReuseData();
        if (_.isEmpty(reuseData.suites)) {
            return testSuites;
        }
        return testSuites.map(function (suite) { return applyReuse(reuseData)(suite); });
    };
    ToolRunner.prototype._loadReuseData = function () {
        try {
            return utils.require(path.resolve(this._reportPath, 'data'));
        }
        catch (e) {
            utils.logger.warn(chalk.yellow("Nothing to reuse in " + this._reportPath));
            return {};
        }
    };
    return ToolRunner;
}());
function applyReuse(reuseData) {
    var isBrowserResultReused = false;
    var reuseBrowserResult = function (suite) {
        if (suite.children) {
            suite.children = suite.children.map(reuseBrowserResult);
            return isBrowserResultReused
                ? _.set(suite, 'status', getReuseStatus(reuseData.suites, suite))
                : suite;
        }
        return _.set(suite, 'browsers', suite.browsers.map(function (bro) {
            var browserResult = getReuseBrowserResult(reuseData.suites, suite.suitePath, bro.name);
            if (browserResult) {
                isBrowserResultReused = true;
                suite.status = getReuseStatus(reuseData.suites, suite);
            }
            return _.extend(bro, browserResult);
        }));
    };
    return reuseBrowserResult;
}
function getReuseStatus(reuseSuites, _a) {
    var suitePath = _a.suitePath, defaultStatus = _a.status;
    var reuseNode = findNode(reuseSuites, suitePath);
    return _.get(reuseNode, 'status', defaultStatus);
}
function getReuseBrowserResult(reuseSuites, suitePath, browserId) {
    var reuseNode = findNode(reuseSuites, suitePath);
    return _.find(_.get(reuseNode, 'browsers'), { name: browserId });
}
//# sourceMappingURL=base-tool-runner.js.map