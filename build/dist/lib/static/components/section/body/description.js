'use strict';
import * as tslib_1 from "tslib";
import React, { Component, Fragment } from 'react';
import Markdown from 'react-markdown';
import PropTypes from 'prop-types';
import ToggleOpen from './toggle-open';
var Description = /** @class */ (function (_super) {
    tslib_1.__extends(Description, _super);
    function Description() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Description.prototype.render = function () {
        var mdContent = React.createElement(Markdown, { source: this.props.content });
        return (React.createElement(Fragment, null,
            React.createElement(ToggleOpen, { title: 'Description', content: mdContent })));
    };
    Description.propTypes = {
        content: PropTypes.string.isRequired
    };
    return Description;
}(Component));
export default Description;
//# sourceMappingURL=description.js.map