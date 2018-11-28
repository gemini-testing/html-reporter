'use strict';
import * as tslib_1 from "tslib";
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import SectionCommon from './section/section-common';
import { bindActionCreators } from 'redux';
import clientEvents from '../../gui/constants/client-events';
import { suiteBegin, testBegin, testResult, testsEnd } from '../modules/actions';
var Suites = /** @class */ (function (_super) {
    tslib_1.__extends(Suites, _super);
    function Suites() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Suites.prototype.componentDidMount = function () {
        this.props.gui && this._subscribeToEvents();
    };
    Suites.prototype._subscribeToEvents = function () {
        var _this = this;
        var actions = this.props.actions;
        var eventSource = new EventSource('/events');
        eventSource.addEventListener(clientEvents.BEGIN_SUITE, function (e) {
            var data = JSON.parse(e.data);
            actions.suiteBegin(data);
        });
        eventSource.addEventListener(clientEvents.BEGIN_STATE, function (e) {
            var data = JSON.parse(e.data);
            actions.testBegin(data);
        });
        [clientEvents.TEST_RESULT, clientEvents.ERROR].forEach(function (eventName) {
            eventSource.addEventListener(eventName, function (e) {
                var data = JSON.parse(e.data);
                actions.testResult(data);
            });
        });
        eventSource.addEventListener(clientEvents.END, function () {
            _this.props.actions.testsEnd();
        });
    };
    Suites.prototype.render = function () {
        var suiteIds = this.props.suiteIds;
        return (React.createElement("div", { className: "sections" }, suiteIds.map(function (suiteId) {
            return React.createElement(SectionCommon, { key: suiteId, suiteId: suiteId });
        })));
    };
    Suites.propTypes = {
        suiteIds: PropTypes.arrayOf(PropTypes.string),
        gui: PropTypes.bool
    };
    return Suites;
}(Component));
var actions = { testBegin: testBegin, suiteBegin: suiteBegin, testResult: testResult, testsEnd: testsEnd };
export default connect(function (state) { return ({
    suiteIds: state.suiteIds[state.view.viewMode],
    gui: state.gui
}); }, function (dispatch) { return ({ actions: bindActionCreators(actions, dispatch) }); })(Suites);
//# sourceMappingURL=suites.js.map