'use strict';
import * as tslib_1 from "tslib";
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Screenshot from './screenshot';
import { isUpdatedStatus } from '../../../common-utils';
var StateSuccess = /** @class */ (function (_super) {
    tslib_1.__extends(StateSuccess, _super);
    function StateSuccess() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    StateSuccess.prototype.render = function () {
        var _a = this.props, status = _a.status, expected = _a.expected;
        return (React.createElement("div", { className: "image-box__image" },
            React.createElement(Screenshot, { noCache: isUpdatedStatus(status), imagePath: expected })));
    };
    StateSuccess.propTypes = {
        status: PropTypes.string.isRequired,
        expected: PropTypes.string.isRequired
    };
    return StateSuccess;
}(Component));
export default StateSuccess;
//# sourceMappingURL=state-success.js.map