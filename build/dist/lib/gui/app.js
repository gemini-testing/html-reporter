'use strict';
var _ = require('lodash');
var ToolRunnerFactory = require('./tool-runner-factory');
module.exports = /** @class */ (function () {
    function App(paths, tool, configs) {
        var program = configs.program;
        this._tool = ToolRunnerFactory.create(program.name(), paths, tool, configs);
        this._browserConfigs = [];
        this._retryCache = {};
    }
    App.create = function (paths, tool, configs) {
        return new this(paths, tool, configs);
    };
    App.prototype.initialize = function () {
        return this._tool.initialize();
    };
    App.prototype.finalize = function () {
        this._tool.finalize();
    };
    App.prototype.run = function (tests) {
        return _.isEmpty(tests)
            ? this._tool.run()
            : this._runWithoutRetries(tests);
    };
    App.prototype._runWithoutRetries = function (tests) {
        var _this = this;
        if (_.isEmpty(this._browserConfigs)) {
            this._browserConfigs = _.map(this._tool.config.getBrowserIds(), function (id) { return _this._tool.config.forBrowser(id); });
        }
        this._disableRetries();
        return this._tool.run(tests)
            .finally(function () { return _this._restoreRetries(); });
    };
    App.prototype.updateReferenceImage = function (failedTests) {
        if (failedTests === void 0) { failedTests = []; }
        return this._tool.updateReferenceImage(failedTests);
    };
    App.prototype.addClient = function (connection) {
        this._tool.addClient(connection);
    };
    Object.defineProperty(App.prototype, "data", {
        get: function () {
            return this._tool.tree;
        },
        enumerable: true,
        configurable: true
    });
    App.prototype._disableRetries = function () {
        var _this = this;
        this._browserConfigs.forEach(function (broConfig) {
            _this._retryCache[broConfig.id] = broConfig.retry;
            broConfig.retry = 0;
        });
    };
    App.prototype._restoreRetries = function () {
        var _this = this;
        this._browserConfigs.forEach(function (broConfig) {
            broConfig.retry = _this._retryCache[broConfig.id];
        });
    };
    return App;
}());
//# sourceMappingURL=app.js.map