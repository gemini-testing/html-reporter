'use strict';

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';
import LazilyRender from '@gemini-testing/react-lazily-render';

import SectionCommon from './section/section-common';
import clientEvents from '../../gui/constants/client-events';
import {suiteBegin, testBegin, testResult, testsEnd} from '../modules/actions';
import {shouldSuiteBeShownByName, shouldSuiteBeShownByBrowser} from '../modules/utils';

class Suites extends Component {
    static propTypes = {
        suiteIds: PropTypes.arrayOf(PropTypes.string),
        gui: PropTypes.bool,
        lazyLoadOffset: PropTypes.number
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

        eventSource.addEventListener(clientEvents.END, () => {
            this.props.actions.testsEnd();
        });
    }

    render() {
        const {suites, suiteIds, filterByName, filteredBrowsers, lazyLoadOffset} = this.props;

        return (
            <div className="sections">
                {suiteIds.map((suiteId) => {
                    const sectionProps = {
                        key: suiteId,
                        suite: suites[suiteId],
                        filterByName: filterByName,
                        filteredBrowsers: filteredBrowsers
                    };

                    if (lazyLoadOffset > 0) {
                        sectionProps.eventToUpdate = clientEvents.VIEW_CHANGED;
                    }

                    const sectionElem = <SectionCommon {...sectionProps} />;

                    return lazyLoadOffset > 0
                        ? <LazilyRender eventToUpdate={clientEvents.VIEW_CHANGED} key={suiteId} offset={lazyLoadOffset} content={sectionElem} />
                        : sectionElem;
                })}
            </div>
        );
    }
}

const actions = {testBegin, suiteBegin, testResult, testsEnd};

export default connect(
    (state) => {
        const {filterByName, filteredBrowsers, lazyLoadOffset} = state.view;
        let suiteIds = state.suiteIds[state.view.viewMode];

        if (filteredBrowsers.length > 0) {
            suiteIds = suiteIds.filter(id => shouldSuiteBeShownByBrowser(state.suites[id], filteredBrowsers));
        }

        if (filterByName) {
            suiteIds = suiteIds.filter(id => shouldSuiteBeShownByName(state.suites[id], filterByName));
        }

        return ({
            suiteIds,
            suites: state.suites,
            gui: state.gui,
            filterByName,
            filteredBrowsers,
            lazyLoadOffset
        });
    },
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(Suites);
