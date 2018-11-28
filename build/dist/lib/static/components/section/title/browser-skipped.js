'use strict';
import * as tslib_1 from "tslib";
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Parser from 'html-react-parser';
var SectionBrowserTitleSkipped = /** @class */ (function (_super) {
    tslib_1.__extends(SectionBrowserTitleSkipped, _super);
    function SectionBrowserTitleSkipped() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    SectionBrowserTitleSkipped.prototype.render = function () {
        var _a = this.props.result, name = _a.name, reason = _a.reason;
        return (React.createElement("div", { className: "section__title section__title_skipped" },
            "[skipped] ",
            name,
            reason && ', reason: ',
            reason && Parser(reason)));
    };
    SectionBrowserTitleSkipped.propTypes = {
        result: PropTypes.shape({
            name: PropTypes.string.isRequired,
            reason: PropTypes.string
        })
    };
    return SectionBrowserTitleSkipped;
}(Component));
export default SectionBrowserTitleSkipped;
//# sourceMappingURL=browser-skipped.js.map