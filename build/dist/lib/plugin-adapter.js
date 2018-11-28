'use strict';
var _ = require('lodash');
var Promise = require('bluebird');
var parseConfig = require('./config');
var ReportBuilderFactory = require('./report-builder-factory');
var utils = require('./server-utils');
var cliCommands = require('./cli-commands');
Promise.promisifyAll(require('fs-extra'));
module.exports = /** @class */ (function () {
    function PluginAdapter(tool, opts, toolName) {
        this._tool = tool;
        this._toolName = toolName;
        this._config = parseConfig(opts);
    }
    PluginAdapter.create = function (tool, opts, toolName) {
        return new this(tool, opts, toolName);
    };
    PluginAdapter.prototype.isEnabled = function () {
        return this._config.enabled;
    };
    PluginAdapter.prototype.addCliCommands = function () {
        var _this = this;
        _.values(cliCommands).forEach(function (command) {
            _this._tool.on(_this._tool.events.CLI, function (commander) {
                require("./cli-commands/" + command)(commander, _this._config, _this._tool);
                commander.prependListener("command:" + command, function () { return _this._run = _.noop; });
            });
        });
        return this;
    };
    PluginAdapter.prototype.init = function (prepareData, prepareImages) {
        var _this = this;
        this._tool.on(this._tool.events.INIT, function () { return _this._run(prepareData, prepareImages); });
        return this;
    };
    PluginAdapter.prototype._run = function (prepareData, prepareImages) {
        var reportBuilder = ReportBuilderFactory.create(this._toolName, this._tool, this._config);
        var generateReport = Promise
            .all([
            prepareData(this._tool, reportBuilder),
            prepareImages(this._tool, this._config, reportBuilder)
        ])
            .then(function () { return reportBuilder.save(); })
            .then(utils.logPathToHtmlReport)
            .catch(utils.logError);
        var endRunnerEvent = this._tool.events.RUNNER_END || this._tool.events.END_RUNNER;
        this._tool.on(endRunnerEvent, function () { return generateReport; });
    };
    return PluginAdapter;
}());
//# sourceMappingURL=plugin-adapter.js.map