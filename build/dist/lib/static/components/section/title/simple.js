'use strict';
import * as tslib_1 from "tslib";
import React, { Component } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import ClipboardButton from 'react-clipboard.js';
import { retrySuite } from '../../../modules/actions';
var SectionTitle = /** @class */ (function (_super) {
    tslib_1.__extends(SectionTitle, _super);
    function SectionTitle() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.onSuiteRetry = function (e) {
            e.stopPropagation();
            _this.props.retrySuite(_this.props.suite);
        };
        return _this;
    }
    SectionTitle.prototype.render = function () {
        var _a = this.props, name = _a.name, handler = _a.handler, gui = _a.gui;
        return (React.createElement("div", { className: "section__title", onClick: handler },
            name,
            this._drawCopyButton(),
            gui && this._drawRetryButton()));
    };
    SectionTitle.prototype._drawCopyButton = function () {
        return (React.createElement(ClipboardButton, { onClick: function (e) { return e.stopPropagation(); }, className: "button section__icon section__icon_copy-to-clipboard", title: "copy to clipboard", "data-clipboard-text": this.props.suite.suitePath.join(' ') }));
    };
    SectionTitle.prototype._drawRetryButton = function () {
        return (React.createElement("button", { className: "button section__icon section__icon_retry", title: "retry suite", onClick: this.onSuiteRetry }));
    };
    SectionTitle.propTypes = {
        name: PropTypes.string.isRequired,
        suite: PropTypes.shape({
            suitePath: PropTypes.array
        }).isRequired,
        handler: PropTypes.func.isRequired,
        gui: PropTypes.bool
    };
    return SectionTitle;
}(Component));
export default connect(function (_a) {
    var gui = _a.gui;
    return ({ gui: gui });
}, { retrySuite: retrySuite })(SectionTitle);
//# sourceMappingURL=simple.js.map