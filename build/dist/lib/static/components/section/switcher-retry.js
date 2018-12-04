"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = tslib_1.__importStar(require("react"));
var semantic_ui_react_1 = require("semantic-ui-react");
var SwitcherRetry = /** @class */ (function (_super) {
    tslib_1.__extends(SwitcherRetry, _super);
    function SwitcherRetry(props, state) {
        var _this = _super.call(this, props, state) || this;
        _this.state = { retry: !_this.props.retries ? 0 : _this.props.retries.length };
        _this._onChange.bind(_this);
        return _this;
    }
    SwitcherRetry.prototype.render = function () {
        var _this = this;
        var retries = this.props.retries;
        if (!retries || retries.length === 0) {
            return null;
        }
        return (react_1.default.createElement(semantic_ui_react_1.Pagination, { defaultActivePage: 1, totalPages: retries.length, onPageChange: function (event, data) { return data && _this._onChange(data.activePage - 1); } }));
    };
    SwitcherRetry.prototype._onChange = function (index) {
        this.setState({ retry: index });
        this.props.onChange(index);
    };
    SwitcherRetry.defaultProps = {
        retries: []
    };
    return SwitcherRetry;
}(react_1.Component));
exports.default = SwitcherRetry;
//# sourceMappingURL=switcher-retry.js.map