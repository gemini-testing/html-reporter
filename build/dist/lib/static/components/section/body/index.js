'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var lodash_1 = tslib_1.__importDefault(require("lodash"));
var react_1 = tslib_1.__importStar(require("react"));
var react_redux_1 = require("react-redux");
var redux_1 = require("redux");
var switcher_style_1 = tslib_1.__importDefault(require("../switcher-style"));
var switcher_retry_1 = tslib_1.__importDefault(require("../switcher-retry"));
var button_1 = tslib_1.__importDefault(require("../../controls/button"));
var index_1 = tslib_1.__importDefault(require("../../state/index"));
var meta_info_1 = tslib_1.__importDefault(require("./meta-info"));
var description_1 = tslib_1.__importDefault(require("./description"));
var common_utils_1 = require("../../../../common-utils");
var actions = require('../../../modules/actions');
var Body = /** @class */ (function (_super) {
    tslib_1.__extends(Body, _super);
    function Body(props, state) {
        var _this = _super.call(this, props, state) || this;
        _this.onSwitcherStyleChange = function (index) {
            _this.setState({ color: index });
        };
        _this.onSwitcherRetryChange = function (index) {
            _this.setState({ retry: index });
        };
        _this.onTestAccept = function (stateName) {
            var _a = _this.props, result = _a.result, suite = _a.suite;
            _this.props.actions.acceptTest(suite, result.name, _this.state.retry, stateName);
        };
        _this.onTestRetry = function () {
            var _a = _this.props, result = _a.result, suite = _a.suite;
            _this.props.actions.retryTest(suite, result.name);
        };
        _this._addRetryButton = function () {
            var _a = _this.props, gui = _a.gui, running = _a.running;
            return gui
                ? (react_1.default.createElement("div", { className: 'controls__item' },
                    react_1.default.createElement(button_1.default, { label: '\u21BB Retry', isSuiteControl: true, isDisabled: running, handler: _this.onTestRetry })))
                : null;
        };
        _this._getActiveResult = function () {
            var _a = _this.props, result = _a.result, retries = _a.retries;
            return retries.concat(result)[_this.state.retry];
        };
        _this.state = {
            color: 1,
            retry: _this.props.retries.length
        };
        _this.onSwitcherStyleChange.bind(_this);
        _this.onSwitcherRetryChange.bind(_this);
        _this.onTestRetry.bind(_this);
        _this.onTestAccept.bind(_this);
        return _this;
    }
    Body.prototype._getTabs = function () {
        var _this = this;
        var activeResult = this._getActiveResult();
        if (lodash_1.default.isEmpty(activeResult.imagesInfo)) {
            return common_utils_1.isSuccessStatus(activeResult.status) ? null : this._drawTab(activeResult);
        }
        var tabs = activeResult.imagesInfo.map(function (imageInfo, idx) {
            var stateName = imageInfo.stateName;
            var reason = imageInfo.reason || activeResult.reason;
            var state = Object.assign({ image: true, reason: reason }, imageInfo);
            return _this._drawTab(state, stateName || idx);
        });
        return this._shouldAddErrorTab(activeResult)
            ? tabs.concat(this._drawTab(activeResult))
            : tabs;
    };
    Body.prototype._drawTab = function (state, key) {
        if (key === void 0) { key = ''; }
        return (react_1.default.createElement("div", { key: key, className: 'tab' },
            react_1.default.createElement("div", { className: 'tab__item tab__item_active' },
                react_1.default.createElement(index_1.default, { state: state, acceptHandler: this.onTestAccept }))));
    };
    Body.prototype._shouldAddErrorTab = function (_a) {
        var multipleTabs = _a.multipleTabs, status = _a.status, screenshot = _a.screenshot;
        return multipleTabs && common_utils_1.isErroredStatus(status) && !screenshot;
    };
    Body.prototype.render = function () {
        var retries = this.props.retries;
        var activeResult = this._getActiveResult();
        var metaInfo = activeResult.metaInfo, suiteUrl = activeResult.suiteUrl, description = activeResult.description;
        return (react_1.default.createElement("div", { className: 'section__body' },
            react_1.default.createElement("div", { className: "image-box cswitcher_color_" + this.state.color },
                react_1.default.createElement("div", { className: 'controls' },
                    react_1.default.createElement("div", { className: 'controls__item' },
                        react_1.default.createElement(switcher_style_1.default, { onChange: this.onSwitcherStyleChange }),
                        react_1.default.createElement(switcher_retry_1.default, { onChange: this.onSwitcherRetryChange, retries: retries })),
                    this._addRetryButton()),
                react_1.default.createElement(meta_info_1.default, { metaInfo: metaInfo, suiteUrl: suiteUrl }),
                description && react_1.default.createElement(description_1.default, { content: description }),
                this._getTabs())));
    };
    Body.defaultProps = {
        retries: []
    };
    return Body;
}(react_1.Component));
exports.default = react_redux_1.connect(function (state) { return ({ gui: state.gui, running: state.running }); }, function (dispatch) { return ({ actions: redux_1.bindActionCreators(actions, dispatch) }); })(Body);
//# sourceMappingURL=index.js.map