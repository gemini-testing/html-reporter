'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = tslib_1.__importStar(require("react"));
var Parser = require('html-react-parser');
var SectionBrowserTitleSkipped = /** @class */ (function (_super) {
    tslib_1.__extends(SectionBrowserTitleSkipped, _super);
    function SectionBrowserTitleSkipped() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    SectionBrowserTitleSkipped.prototype.render = function () {
        var _a = this.props.result, name = _a.name, reason = _a.reason;
        return (react_1.default.createElement("div", { className: 'section__title section__title_skipped' },
            "[skipped] ",
            name,
            reason && ', reason: ',
            reason && Parser(reason)));
    };
    return SectionBrowserTitleSkipped;
}(react_1.Component));
exports.default = SectionBrowserTitleSkipped;
//# sourceMappingURL=browser-skipped.js.map