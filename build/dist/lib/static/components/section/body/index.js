'use strict';
import * as tslib_1 from "tslib";
import { isEmpty } from 'lodash';
import React, { Component } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import PropTypes from 'prop-types';
import SwitcherStyle from '../switcher-style';
import SwitcherRetry from '../switcher-retry';
import ControlButton from '../../controls/button';
import State from '../../state';
import MetaInfo from './meta-info';
import Description from './description';
import * as actions from '../../../modules/actions';
import { isSuccessStatus, isErroredStatus } from '../../../../common-utils';
var Body = /** @class */ (function (_super) {
    tslib_1.__extends(Body, _super);
    function Body(props) {
        var _this = _super.call(this, props) || this;
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
                ? (React.createElement("div", { className: "controls__item" },
                    React.createElement(ControlButton, { label: "\u21BB Retry", isSuiteControl: true, isDisabled: running, handler: _this.onTestRetry })))
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
        return _this;
    }
    Body.prototype._getTabs = function () {
        var _this = this;
        var activeResult = this._getActiveResult();
        if (isEmpty(activeResult.imagesInfo)) {
            return isSuccessStatus(activeResult.status) ? null : this._drawTab(activeResult);
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
        return (React.createElement("div", { key: key, className: "tab" },
            React.createElement("div", { className: "tab__item tab__item_active" },
                React.createElement(State, { state: state, acceptHandler: this.onTestAccept }))));
    };
    Body.prototype._shouldAddErrorTab = function (_a) {
        var multipleTabs = _a.multipleTabs, status = _a.status, screenshot = _a.screenshot;
        return multipleTabs && isErroredStatus(status) && !screenshot;
    };
    Body.prototype.render = function () {
        var retries = this.props.retries;
        var activeResult = this._getActiveResult();
        var metaInfo = activeResult.metaInfo, suiteUrl = activeResult.suiteUrl, description = activeResult.description;
        return (React.createElement("div", { className: "section__body" },
            React.createElement("div", { className: "image-box cswitcher_color_" + this.state.color },
                React.createElement("div", { className: "controls" },
                    React.createElement("div", { className: "controls__item" },
                        React.createElement(SwitcherStyle, { onChange: this.onSwitcherStyleChange }),
                        React.createElement(SwitcherRetry, { onChange: this.onSwitcherRetryChange, retries: retries })),
                    this._addRetryButton()),
                React.createElement(MetaInfo, { metaInfo: metaInfo, suiteUrl: suiteUrl }),
                description && React.createElement(Description, { content: description }),
                this._getTabs())));
    };
    Body.propTypes = {
        result: PropTypes.object.isRequired,
        retries: PropTypes.array,
        suite: PropTypes.object
    };
    Body.defaultProps = {
        retries: []
    };
    return Body;
}(Component));
export default connect(function (state) { return ({ gui: state.gui, running: state.running }); }, function (dispatch) { return ({ actions: bindActionCreators(actions, dispatch) }); })(Body);
//# sourceMappingURL=index.js.map