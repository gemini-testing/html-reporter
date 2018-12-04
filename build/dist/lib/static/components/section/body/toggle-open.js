'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = tslib_1.__importStar(require("react"));
var classname_1 = require("@bem-react/classname");
var ToggleOpen = /** @class */ (function (_super) {
    tslib_1.__extends(ToggleOpen, _super);
    function ToggleOpen(props) {
        var _this = _super.call(this, props) || this;
        _this.state = { isCollapsed: true };
        // binding
        _this.toggleHandler = _this.toggleHandler.bind(_this);
        return _this;
    }
    ToggleOpen.prototype.render = function () {
        var _a = this.props, title = _a.title, content = _a.content;
        var toggle = classname_1.cn('toggle-open');
        return (react_1.default.createElement("div", { className: toggle({ collapsed: this.state.isCollapsed }) },
            react_1.default.createElement("div", { onClick: this.toggleHandler, className: 'toggle-open__switcher' }, title),
            react_1.default.createElement("div", { className: 'toggle-open__content' }, content)));
    };
    ToggleOpen.prototype.toggleHandler = function (event) {
        event.preventDefault();
        this.setState(function (state) { return ({
            isCollapsed: !state.isCollapsed
        }); });
    };
    return ToggleOpen;
}(react_1.Component));
exports.default = ToggleOpen;
//# sourceMappingURL=toggle-open.js.map