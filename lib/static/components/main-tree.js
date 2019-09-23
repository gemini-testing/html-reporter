'use strict';

import React, {Component} from 'react';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import {bindActionCreators} from 'redux';

import ErrorGroupsList from './error-groups/list';
import Suites from './suites';
import clientEvents from '../../gui/constants/client-events';
import {suiteBegin, testBegin, testResult, testsEnd, fetchDb} from '../modules/actions';

class MainTree extends Component {
    static propTypes = {
        gui: PropTypes.bool,
        groupByError: PropTypes.bool.isRequired
    };

    componentDidMount() {
        console.log('did mount');
        this.props.actions.fetchDb();
        this.props.gui && this._subscribeToEvents();
    }
    _subscribeToEvents() {
        const {actions} = this.props;
        const eventSource = new EventSource('/events');
        eventSource.addEventListener(clientEvents.BEGIN_SUITE, (e) => {
            const data = JSON.parse(e.data);
            actions.suiteBegin(data);
        });

        eventSource.addEventListener(clientEvents.BEGIN_STATE, (e) => {
            const data = JSON.parse(e.data);
            actions.testBegin(data);
        });

        [clientEvents.TEST_RESULT, clientEvents.ERROR].forEach((eventName) => {
            eventSource.addEventListener(eventName, (e) => {
                const data = JSON.parse(e.data);
                actions.testResult(data);
            });
        });

        eventSource.addEventListener(clientEvents.END, () => {
            this.props.actions.testsEnd();
        });
    }

    render() {
        console.log('main tree');
        const {groupByError} = this.props;

        return groupByError
            ? <ErrorGroupsList/>
            : <Suites/>;
    }
}

const actions = {testBegin, suiteBegin, testResult, testsEnd, fetchDb};

export default connect(
    ({gui, view: {groupByError}}) => ({gui, groupByError}),
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(MainTree);
