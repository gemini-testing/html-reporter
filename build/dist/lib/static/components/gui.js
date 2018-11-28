'use strict';
import * as tslib_1 from "tslib";
import React, { Component, Fragment } from 'react';
import { connect } from 'react-redux';
import { initial } from '../modules/actions';
import ControlButtons from './controls/gui-controls';
import SkippedList from './skipped-list';
import Suites from './suites';
var Gui = /** @class */ (function (_super) {
    tslib_1.__extends(Gui, _super);
    function Gui() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Gui.prototype.componentDidMount = function () {
        this.props.gui && this.props.initial();
    };
    Gui.prototype.render = function () {
        return (React.createElement(Fragment, null,
            React.createElement(ControlButtons, null),
            React.createElement(SkippedList, null),
            React.createElement(Suites, null)));
    };
    return Gui;
}(Component));
export default connect(function (_a) {
    var gui = _a.gui;
    return ({ gui: gui });
}, { initial: initial })(Gui);
//# sourceMappingURL=gui.js.map