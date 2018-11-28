'use strict';
import * as tslib_1 from "tslib";
import React, { Component, Fragment } from 'react';
import Summary from './summary';
import ControlButtons from './controls/report-controls';
import SkippedList from './skipped-list';
import Suites from './suites';
var Report = /** @class */ (function (_super) {
    tslib_1.__extends(Report, _super);
    function Report() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Report.prototype.render = function () {
        return (React.createElement(Fragment, null,
            React.createElement(Summary, null),
            React.createElement(ControlButtons, null),
            React.createElement(SkippedList, null),
            React.createElement(Suites, null)));
    };
    return Report;
}(Component));
export default Report;
//# sourceMappingURL=report.js.map