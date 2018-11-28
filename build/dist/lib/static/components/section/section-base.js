'use strict';
import * as tslib_1 from "tslib";
import { Component } from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { isFailStatus, isSkippedStatus } from '../../../common-utils';
var Base = /** @class */ (function (_super) {
    tslib_1.__extends(Base, _super);
    function Base(props) {
        var _this = _super.call(this, props) || this;
        _this._toggleState = _this._toggleState.bind(_this);
        return _this;
    }
    Base.prototype.componentWillMount = function () {
        var _a = this._getStateFromProps(), failed = _a.failed, retried = _a.retried, skipped = _a.skipped, expand = _a.expand;
        this.setState({
            failed: failed,
            retried: retried,
            skipped: skipped,
            collapsed: this._shouldBeCollapsed({ failed: failed, retried: retried, expand: expand })
        });
    };
    Base.prototype.componentWillReceiveProps = function (nextProps) {
        var _a = this._getStateFromProps(), failed = _a.failed, retried = _a.retried, updated = _a.updated;
        var updatedStatus = { failed: failed, retried: retried, updated: updated, expand: nextProps.expand };
        this.setState({
            failed: failed,
            retried: retried,
            collapsed: this._shouldBeCollapsed(updatedStatus)
        });
    };
    Base.prototype.render = function () {
        return null;
    };
    Base.prototype._shouldBeCollapsed = function (_a) {
        var failed = _a.failed, retried = _a.retried, expand = _a.expand;
        if (expand === 'errors' && failed) {
            return false;
        }
        else if (expand === 'retries' && retried) {
            return false;
        }
        else if (expand === 'all') {
            return false;
        }
        return true;
    };
    Base.prototype._toggleState = function () {
        this.setState({ collapsed: !this.state.collapsed });
    };
    Base.prototype._resolveSectionStatus = function (status) {
        var collapsed = this.state.collapsed;
        var baseClasses = ['section', { 'section_collapsed': collapsed }];
        if (status) {
            return classNames(baseClasses, "section_status_" + status);
        }
        return classNames(baseClasses, { 'section_status_skip': isSkippedStatus(status) }, { 'section_status_fail': isFailStatus(status) }, { 'section_status_success': !(isSkippedStatus(status) || isFailStatus(status)) });
    };
    Base.propTypes = {
        expand: PropTypes.string,
        viewMode: PropTypes.string
    };
    return Base;
}(Component));
export default Base;
//# sourceMappingURL=section-base.js.map