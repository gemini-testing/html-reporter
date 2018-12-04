'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = require("react");
var React = tslib_1.__importStar(require("react"));
var redux_1 = require("redux");
var react_redux_1 = require("react-redux");
var actions = tslib_1.__importStar(require("../../modules/actions"));
var semantic_ui_react_1 = require("semantic-ui-react");
var BaseHostInput = /** @class */ (function (_super) {
    tslib_1.__extends(BaseHostInput, _super);
    function BaseHostInput(props) {
        var _this = _super.call(this, props) || this;
        _this._onChange = _this._onChange.bind(_this);
        return _this;
    }
    BaseHostInput.prototype.render = function () {
        return (React.createElement(semantic_ui_react_1.Input, { className: 'text-input', size: 'medium', value: this.props.baseHost, placeholder: 'change original host for view in browser', onChange: this._onChange }));
    };
    BaseHostInput.prototype._onChange = function (event) {
        this.props.actions.updateBaseHost(event.target.value);
    };
    return BaseHostInput;
}(react_1.Component));
exports.default = react_redux_1.connect(function (state) { return ({ baseHost: state.view.baseHost }); }, function (dispatch) { return ({ actions: redux_1.bindActionCreators(actions, dispatch) }); })(BaseHostInput);
//# sourceMappingURL=base-host.js.map