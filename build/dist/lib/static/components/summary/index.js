'use strict';
import * as tslib_1 from "tslib";
import React, { Component } from 'react';
import { connect } from 'react-redux';
import SummaryKey from './item';
var Summary = /** @class */ (function (_super) {
    tslib_1.__extends(Summary, _super);
    function Summary() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Summary.prototype.render = function () {
        var _a = this.props.stats, total = _a.total, passed = _a.passed, failed = _a.failed, skipped = _a.skipped, retries = _a.retries;
        return (React.createElement("dl", { className: "summary" },
            React.createElement(SummaryKey, { label: "Total Tests", value: total }),
            React.createElement(SummaryKey, { label: "Passed", value: passed }),
            React.createElement(SummaryKey, { label: "Failed", value: failed, isFailed: true }),
            React.createElement(SummaryKey, { label: "Skipped", value: skipped }),
            React.createElement(SummaryKey, { label: "Retries", value: retries })));
    };
    return Summary;
}(Component));
export default connect(function (state) { return ({
    stats: state.stats
}); })(Summary);
//# sourceMappingURL=index.js.map