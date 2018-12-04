"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = tslib_1.__importStar(require("react"));
var index_1 = tslib_1.__importDefault(require("./summary/index"));
var report_controls_1 = tslib_1.__importDefault(require("./controls/report-controls"));
var skipped_list_1 = tslib_1.__importDefault(require("./skipped-list"));
var suites_1 = tslib_1.__importDefault(require("./suites"));
var Report = /** @class */ (function (_super) {
    tslib_1.__extends(Report, _super);
    function Report() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Report.prototype.render = function () {
        return (react_1.default.createElement(react_1.Fragment, null,
            react_1.default.createElement(index_1.default, null),
            react_1.default.createElement(report_controls_1.default, null),
            react_1.default.createElement(skipped_list_1.default, null),
            react_1.default.createElement(suites_1.default, null)));
    };
    return Report;
}(react_1.Component));
exports.default = Report;
//# sourceMappingURL=report.js.map