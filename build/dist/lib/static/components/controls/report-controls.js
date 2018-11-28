'use strict';
import * as tslib_1 from "tslib";
import React, { Component } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import * as actions from '../../modules/actions';
import CommonControls from './common-controls';
var ControlButtons = /** @class */ (function (_super) {
    tslib_1.__extends(ControlButtons, _super);
    function ControlButtons() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    ControlButtons.prototype.render = function () {
        return (React.createElement("div", { className: "control-buttons" },
            React.createElement(CommonControls, null)));
    };
    return ControlButtons;
}(Component));
export default connect(function (state) { return ({ view: state.view }); }, function (dispatch) { return ({ actions: bindActionCreators(actions, dispatch) }); })(ControlButtons);
//# sourceMappingURL=report-controls.js.map