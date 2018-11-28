'use strict';
import * as tslib_1 from "tslib";
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import * as actions from '../../modules/actions';
import { Input } from 'semantic-ui-react';
var BaseHostInput = /** @class */ (function (_super) {
    tslib_1.__extends(BaseHostInput, _super);
    function BaseHostInput(props) {
        var _this = _super.call(this, props) || this;
        _this._onChange = _this._onChange.bind(_this);
        return _this;
    }
    BaseHostInput.prototype.render = function () {
        return (React.createElement(Input, { className: "text-input", size: "40", value: this.props.baseHost, placeholder: "change original host for view in browser", onChange: this._onChange }));
    };
    BaseHostInput.prototype._onChange = function (event) {
        this.props.actions.updateBaseHost(event.target.value);
    };
    BaseHostInput.propTypes = {
        baseHost: PropTypes.string.isRequired,
        actions: PropTypes.object.isRequired
    };
    return BaseHostInput;
}(Component));
export default connect(function (state) { return ({ baseHost: state.view.baseHost }); }, function (dispatch) { return ({ actions: bindActionCreators(actions, dispatch) }); })(BaseHostInput);
//# sourceMappingURL=base-host.js.map