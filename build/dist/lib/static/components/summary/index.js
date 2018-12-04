'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = tslib_1.__importStar(require("react"));
var react_redux_1 = require("react-redux");
var item_1 = tslib_1.__importDefault(require("./item"));
var Summary = /** @class */ (function (_super) {
    tslib_1.__extends(Summary, _super);
    function Summary() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Summary.prototype.render = function () {
        var _a = this.props.stats, total = _a.total, passed = _a.passed, failed = _a.failed, skipped = _a.skipped, retries = _a.retries;
        return (react_1.default.createElement("dl", { className: 'summary' },
            react_1.default.createElement(item_1.default, { label: 'Total Tests', value: total }),
            react_1.default.createElement(item_1.default, { label: 'Passed', value: passed }),
            react_1.default.createElement(item_1.default, { label: 'Failed', value: failed, isFailed: true }),
            react_1.default.createElement(item_1.default, { label: 'Skipped', value: skipped }),
            react_1.default.createElement(item_1.default, { label: 'Retries', value: retries })));
    };
    return Summary;
}(react_1.Component));
exports.default = react_redux_1.connect(function (state) { return ({
    stats: state.stats
}); })(Summary);
//# sourceMappingURL=index.js.map