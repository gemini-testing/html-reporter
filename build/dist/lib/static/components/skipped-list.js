"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = tslib_1.__importStar(require("react"));
var classnames_1 = tslib_1.__importDefault(require("classnames"));
var react_redux_1 = require("react-redux");
var Parser = require('html-react-parser');
var SkippedList = /** @class */ (function (_super) {
    tslib_1.__extends(SkippedList, _super);
    function SkippedList() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    SkippedList.prototype.render = function () {
        var _a = this.props, showSkipped = _a.showSkipped, skips = _a.skips;
        var collapsed = !showSkipped;
        var className = classnames_1.default('skipped__list', { collapsed: collapsed });
        var skipsTmpl = skips.length > 0
            ? this._drawSkips(skips)
            : 'There are no skipped tests';
        return (react_1.default.createElement("div", { className: className }, skipsTmpl));
    };
    SkippedList.prototype._drawSkips = function (skips) {
        return skips.map(function (skip, index) {
            var browser = skip.browser, comment = skip.comment, suite = skip.suite;
            return (react_1.default.createElement("div", { key: index },
                suite,
                " > ",
                browser,
                comment && ' reason: ',
                comment && Parser(comment)));
        });
    };
    return SkippedList;
}(react_1.Component));
exports.default = react_redux_1.connect(function (state) { return ({
    showSkipped: state.view.showSkipped,
    skips: state.skips
}); })(SkippedList);
//# sourceMappingURL=skipped-list.js.map