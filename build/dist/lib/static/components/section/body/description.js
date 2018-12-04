'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = tslib_1.__importStar(require("react"));
var toggle_open_1 = tslib_1.__importDefault(require("./toggle-open"));
var ReactMarkdown = require('react-markdown');
var Description = /** @class */ (function (_super) {
    tslib_1.__extends(Description, _super);
    function Description() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Description.prototype.render = function () {
        var mdContent = react_1.default.createElement(ReactMarkdown, { source: this.props.content });
        return (react_1.default.createElement(react_1.Fragment, null,
            react_1.default.createElement(toggle_open_1.default, { title: 'Description', content: mdContent })));
    };
    return Description;
}(react_1.Component));
exports.default = Description;
//# sourceMappingURL=description.js.map