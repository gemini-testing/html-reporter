'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = tslib_1.__importStar(require("react"));
var classname_1 = require("@bem-react/classname");
var SwitcherStyle = /** @class */ (function (_super) {
    tslib_1.__extends(SwitcherStyle, _super);
    function SwitcherStyle(props, state) {
        var _this = _super.call(this, props, state) || this;
        _this.state = { color: 1 };
        return _this;
    }
    SwitcherStyle.prototype.render = function () {
        return (react_1.default.createElement("div", { className: 'cswitcher' },
            this._drawButton(1),
            this._drawButton(2),
            this._drawButton(3)));
    };
    SwitcherStyle.prototype._drawButton = function (index) {
        var _this = this;
        var stateButton = classname_1.cn('state-button');
        var cswitcher = classname_1.cn('cswitcher');
        var cN = classname_1.classnames(stateButton(), cswitcher('item', { selected: index === this.state.color, color: index }));
        return (react_1.default.createElement("button", { className: cN, onClick: function () { return _this._onChange(index); } }, "\u00A0"));
    };
    SwitcherStyle.prototype._onChange = function (index) {
        this.setState({ color: index });
        this.props.onChange(index);
    };
    return SwitcherStyle;
}(react_1.Component));
exports.default = SwitcherStyle;
//# sourceMappingURL=switcher-style.js.map