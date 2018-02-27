'use strict';

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import {uniqueId} from 'lodash';
import SectionCommon from './section/section-common';
import {bindActionCreators} from 'redux';
import {initial, suiteBegin, testBegin, testResult, testsEnd} from '../modules/actions';

class Suites extends Component {
    static propTypes = {
        viewMode: PropTypes.string.isRequired,
        skips: PropTypes.array
    }

    componentDidMount() {
        const {gui, actions} = this.props;
        if (gui) {
            actions.initial();
            this._subscribeToEvents();
        }
    }

    _subscribeToEvents() {
        const {actions} = this.props;
        const eventSource = new EventSource('/events');
        eventSource.addEventListener('beginSuite', (e) => {
            const data = JSON.parse(e.data);
            actions.suiteBegin(data);
        });

        eventSource.addEventListener('beginState', (e) => {
            const data = JSON.parse(e.data);
            actions.testBegin(data);
        });

        ['testResult', 'err'].forEach((eventName) => {
            eventSource.addEventListener(eventName, (e) => {
                const data = JSON.parse(e.data);
                actions.testResult(data);
            });
        });

        eventSource.addEventListener('end', () => {
            this.props.actions.testsEnd();
        });

        eventSource.onerror = () => {
            console.error('Seems like servers went down. Closing connection...');
            eventSource.close();
        };
    }

    render() {
        const {suites, viewMode} = this.props;

        return (
            <div className="sections">
                {suites[viewMode].map((suite) => {
                    const key = uniqueId(`${suite.suitePath}-${suite.name}`);
                    return <SectionCommon key={key} suite={suite}/>;
                })}
            </div>
        );
    }
}

const actions = {initial, testBegin, suiteBegin, testResult, testsEnd};

export default connect(
    (state) => ({
        viewMode: state.view.viewMode,
        suites: state.suites,
        gui: state.gui
    }),
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(Suites);
