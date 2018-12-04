'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = tslib_1.__importStar(require("react"));
var react_redux_1 = require("react-redux");
var prop_types_1 = tslib_1.__importDefault(require("prop-types"));
var classnames_1 = tslib_1.__importDefault(require("classnames"));
var state_error_1 = tslib_1.__importDefault(require("./state-error"));
var state_success_1 = tslib_1.__importDefault(require("./state-success"));
var state_fail_1 = tslib_1.__importDefault(require("./state-fail"));
var button_1 = tslib_1.__importDefault(require("../controls/button"));
var utils_1 = require("../../modules/utils");
var common_utils_1 = require("../../../common-utils");
var State = /** @class */ (function (_super) {
    tslib_1.__extends(State, _super);
    function State() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    State.prototype._getAcceptButton = function () {
        if (!this.props.gui) {
            return null;
        }
        var _a = this.props, state = _a.state, stateName = _a.state.stateName, acceptHandler = _a.acceptHandler;
        var isAcceptDisabled = !utils_1.isAcceptable(state);
        var acceptFn = function () { return acceptHandler(stateName); };
        return (react_1.default.createElement(button_1.default, { label: "\u2714 Accept", isSuiteControl: true, isDisabled: isAcceptDisabled, handler: acceptFn }));
    };
    State.prototype._getStateTitle = function (stateName, status) {
        return stateName
            ? (react_1.default.createElement("div", { className: "state-title state-title_" + status }, stateName))
            : null;
    };
    State.prototype.render = function () {
        var _a = this.props.state, status = _a.status, reason = _a.reason, image = _a.image, expectedPath = _a.expectedPath, actualPath = _a.actualPath, diffPath = _a.diffPath, stateName = _a.stateName;
        var elem = null;
        if (common_utils_1.isErroredStatus(status)) {
            elem = react_1.default.createElement(state_error_1.default, { image: Boolean(image), actual: actualPath, reason: reason });
        }
        else if (common_utils_1.isSuccessStatus(status) || common_utils_1.isUpdatedStatus(status) || (common_utils_1.isIdleStatus(status) && expectedPath)) {
            elem = react_1.default.createElement(state_success_1.default, { status: status, expected: expectedPath });
        }
        else if (common_utils_1.isFailStatus(status)) {
            elem = reason
                ? react_1.default.createElement(state_error_1.default, { image: Boolean(image), actual: actualPath, reason: reason })
                : react_1.default.createElement(state_fail_1.default, { expected: expectedPath, actual: actualPath, diff: diffPath });
        }
        var className = classnames_1.default('image-box__container', { 'image-box__container_scale': this.props.scaleImages });
        return (react_1.default.createElement(react_1.Fragment, null,
            react_1.default.createElement("hr", null),
            this._getStateTitle(stateName, status),
            this._getAcceptButton(),
            react_1.default.createElement("div", { className: className }, elem)));
    };
    State.propTypes = {
        state: prop_types_1.default.shape({
            status: prop_types_1.default.string,
            image: prop_types_1.default.bool,
            reason: prop_types_1.default.object,
            expectedPath: prop_types_1.default.string,
            actualPath: prop_types_1.default.string,
            diffPath: prop_types_1.default.string
        }),
        acceptHandler: prop_types_1.default.func,
        gui: prop_types_1.default.bool,
        scaleImages: prop_types_1.default.bool
    };
    return State;
}(react_1.Component));
exports.default = react_redux_1.connect(function (_a) {
    var gui = _a.gui, scaleImages = _a.view.scaleImages;
    return ({ gui: gui, scaleImages: scaleImages });
})(State);
//# sourceMappingURL=index.js.map