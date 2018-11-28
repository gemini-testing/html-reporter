'use strict';
import * as tslib_1 from "tslib";
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import * as actions from '../../modules/actions';
import { Select } from 'semantic-ui-react';
var ViewSelect = /** @class */ (function (_super) {
    tslib_1.__extends(ViewSelect, _super);
    function ViewSelect(props) {
        var _this = _super.call(this, props) || this;
        _this._onChange = _this._onChange.bind(_this);
        return _this;
    }
    ViewSelect.prototype.render = function () {
        var _a = this.props, view = _a.view, options = _a.options;
        return (React.createElement(Select, { className: "select_type_view", value: view.viewMode, onChange: this._onChange, options: options }));
    };
    ViewSelect.prototype._onChange = function (event) {
        this.props.actions.changeViewMode(event.target.value);
    };
    ViewSelect.propTypes = {
        view: PropTypes.object.isRequired,
        actions: PropTypes.object.isRequired,
        options: PropTypes.array.isRequired
    };
    return ViewSelect;
}(Component));
export default connect(function (state) { return ({ view: state.view }); }, function (dispatch) { return ({ actions: bindActionCreators(actions, dispatch) }); })(ViewSelect);
//# sourceMappingURL=view-select.js.map