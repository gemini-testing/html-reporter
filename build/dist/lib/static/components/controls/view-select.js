"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = tslib_1.__importStar(require("react"));
var redux_1 = require("redux");
var react_redux_1 = require("react-redux");
var actions = tslib_1.__importStar(require("../../modules/actions"));
var semantic_ui_react_1 = require("semantic-ui-react");
var ViewSelect = /** @class */ (function (_super) {
    tslib_1.__extends(ViewSelect, _super);
    function ViewSelect(props) {
        var _this = _super.call(this, props) || this;
        _this._onChange = _this._onChange.bind(_this);
        return _this;
    }
    ViewSelect.prototype.render = function () {
        var _a = this.props, view = _a.view, options = _a.options;
        return (react_1.default.createElement(semantic_ui_react_1.Select, { className: 'select_type_view', value: view.viewMode, onChange: this._onChange, options: options }));
    };
    ViewSelect.prototype._onChange = function (event) {
        this.props.actions.changeViewMode(event.target.value);
    };
    return ViewSelect;
}(react_1.Component));
exports.default = react_redux_1.connect(function (state) { return ({ view: state.view }); }, function (dispatch) { return ({ actions: redux_1.bindActionCreators(actions, dispatch) }); })(ViewSelect);
//# sourceMappingURL=view-select.js.map