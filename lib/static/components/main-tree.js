'use strict';

import React, {Component} from 'react';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import {bindActionCreators} from 'redux';

import ErrorGroupsList from './error-groups/list';
import Suites from './suites';
import clientEvents from '../../gui/constants/client-events';
import {closeDbConnection, fetchDb, suiteBegin, testBegin, testResult, testsEnd} from '../modules/actions';
import {isSqlite} from '../modules/utils';
import Loading from './loading';

class MainTree extends Component {
    static propTypes = {
        gui: PropTypes.bool,
        groupByError: PropTypes.bool.isRequired
    }

    componentDidMount() {
        this.props.gui && this._subscribeToEvents();
        if (this.props.useSqlite) {
            this.props.actions.fetchDb(this.props.databaseUrlsFile);
        }
    }

    componentWillUnmount() {
        if (this.props.useSqlite) {
            this.props.actions.closeDbConnection();
        }
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
        const {groupByError, suites, dbStats} = this.props;
        if (Object.keys(suites).length === 0 && dbStats === undefined) {
            return (<Loading active={true}/>);
        }
        return groupByError
            ? <ErrorGroupsList/>
            : <Suites/>;
    }
}

const actions = {testBegin, suiteBegin, testResult, testsEnd, fetchDb, closeDbConnection};

export default connect(
    (state) => {
        const {groupByError} = state.view;
        return ({
            gui: state.gui,
            groupByError,
            useSqlite: isSqlite(state.saveFormat),
            dbStats: state.dbStats,
            databaseUrlsFile: state.databaseUrlsFile,
            suites: state.suites
        });
    },
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(MainTree);
