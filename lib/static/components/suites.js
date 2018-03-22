'use strict';

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import {uniqueId} from 'lodash';
import SectionCommon from './section/section-common';
import {bindActionCreators} from 'redux';
import clientEvents from '../../gui/constants/client-events';
import {suiteBegin, testBegin, testResult, updateResult, testsEnd} from '../modules/actions';

class Suites extends Component {
    static propTypes = {
        viewMode: PropTypes.string.isRequired,
        expand: PropTypes.string
    }

    componentDidMount() {
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

        eventSource.addEventListener(clientEvents.UPDATE_RESULT, (e) => {
            const data = JSON.parse(e.data);
            actions.updateResult(data);
        });

        eventSource.addEventListener(clientEvents.END, () => {
            this.props.actions.testsEnd();
        });

        eventSource.onerror = () => {
            console.error('Seems like servers went down. Closing connection...');
            eventSource.close();
        };
    }

    render() {
        const {suites, viewMode, expand} = this.props;

        const buildSuites = () => {
            return suites[viewMode].map((suite) => {
                const key = uniqueId(`${suite.suitePath}-${suite.name}`);
                return <SectionCommon key={key} suite={suite} expand={expand} />;
            });
        };

        return (
            <div className="sections">
                {suites[viewMode].length ? buildSuites() : 'No tests'}
            </div>
        );
    }
}

const actions = {testBegin, suiteBegin, testResult, updateResult, testsEnd};

export default connect(
    (state) => ({
        viewMode: state.view.viewMode,
        expand: state.view.expand,
        suites: state.suites,
        gui: state.gui
    }),
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(Suites);
