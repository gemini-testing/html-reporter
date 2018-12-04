'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var classname_1 = require("@bem-react/classname");
var common_utils_1 = require("../../../common-utils");
var Base = /** @class */ (function (_super) {
    tslib_1.__extends(Base, _super);
    function Base(props) {
        var _this = _super.call(this, props) || this;
        _this._toggleState = _this._toggleState.bind(_this);
        return _this;
    }
    Base.prototype._getStateFromProps = function () {
        var returnParams = {
            failed: '',
            retried: '',
            skipped: false,
            updated: '',
            expand: undefined
        };
        return returnParams;
    };
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
        var section = classname_1.cn('section');
        var baseClasses = section({ section_collapsed: collapsed });
        if (status) {
            return classname_1.classnames(baseClasses, "section_status_" + status);
        }
        return classname_1.classnames(baseClasses, section(null, { section_status_skip: common_utils_1.isSkippedStatus(status), section_status_fail: common_utils_1.isFailStatus(status),
            section_status_success: !(common_utils_1.isSkippedStatus(status) || common_utils_1.isFailStatus(status)) }));
    };
    return Base;
}(react_1.Component));
exports.Base = Base;
//# sourceMappingURL=section-base.js.map