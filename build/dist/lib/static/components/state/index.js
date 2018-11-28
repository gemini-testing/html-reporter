'use strict';
import * as tslib_1 from "tslib";
import React, { Component, Fragment } from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import StateError from './state-error';
import StateSuccess from './state-success';
import StateFail from './state-fail';
import ControlButton from '../controls/button';
import { isAcceptable } from '../../modules/utils';
import { isSuccessStatus, isFailStatus, isErroredStatus, isUpdatedStatus, isIdleStatus } from '../../../common-utils';
var State = /** @class */ (function (_super) {
    tslib_1.__extends(State, _super);
    function State() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    State.prototype._getAcceptButton = function () {
        if (!this.props.gui) {
            return null;
        }
        var _a = this.props, state = _a.state, stateName = _a.state.stateName, acceptHandler = _a.acceptHandler;
        var isAcceptDisabled = !isAcceptable(state);
        var acceptFn = function () { return acceptHandler(stateName); };
        return (React.createElement(ControlButton, { label: "\u2714 Accept", isSuiteControl: true, isDisabled: isAcceptDisabled, handler: acceptFn }));
    };
    State.prototype._getStateTitle = function (stateName, status) {
        return stateName
            ? (React.createElement("div", { className: "state-title state-title_" + status }, stateName))
            : null;
    };
    State.prototype.render = function () {
        var _a = this.props.state, status = _a.status, reason = _a.reason, image = _a.image, expectedPath = _a.expectedPath, actualPath = _a.actualPath, diffPath = _a.diffPath, stateName = _a.stateName;
        var elem = null;
        if (isErroredStatus(status)) {
            elem = React.createElement(StateError, { image: Boolean(image), actual: actualPath, reason: reason });
        }
        else if (isSuccessStatus(status) || isUpdatedStatus(status) || (isIdleStatus(status) && expectedPath)) {
            elem = React.createElement(StateSuccess, { status: status, expected: expectedPath });
        }
        else if (isFailStatus(status)) {
            elem = reason
                ? React.createElement(StateError, { image: Boolean(image), actual: actualPath, reason: reason })
                : React.createElement(StateFail, { expected: expectedPath, actual: actualPath, diff: diffPath });
        }
        var className = classNames('image-box__container', { 'image-box__container_scale': this.props.scaleImages });
        return (React.createElement(Fragment, null,
            React.createElement("hr", null),
            this._getStateTitle(stateName, status),
            this._getAcceptButton(),
            React.createElement("div", { className: className }, elem)));
    };
    State.propTypes = {
        state: PropTypes.shape({
            status: PropTypes.string,
            image: PropTypes.bool,
            reason: PropTypes.object,
            expectedPath: PropTypes.string,
            actualPath: PropTypes.string,
            diffPath: PropTypes.string
        }),
        acceptHandler: PropTypes.func,
        gui: PropTypes.bool,
        scaleImages: PropTypes.bool
    };
    return State;
}(Component));
export default connect(function (_a) {
    var gui = _a.gui, scaleImages = _a.view.scaleImages;
    return ({ gui: gui, scaleImages: scaleImages });
})(State);
//# sourceMappingURL=index.js.map