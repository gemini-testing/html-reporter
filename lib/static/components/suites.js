'use strict';

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import LazilyRender from '@gemini-testing/react-lazily-render';

import SectionCommon from './section/section-common';
import clientEvents from '../../gui/constants/client-events';
import {shouldSuiteBeShown} from '../modules/utils';

class Suites extends Component {
    static propTypes = {
        suiteIds: PropTypes.arrayOf(PropTypes.string),
        lazyLoadOffset: PropTypes.number,
        errorGroupTests: PropTypes.object
    }

    render() {
        const {suites, suiteIds, testNameFilter, filteredBrowsers, lazyLoadOffset, errorGroupTests} = this.props;

        const visibleSuiteIds = suiteIds.filter(id =>
            shouldSuiteBeShown({suite: suites[id], testNameFilter, filteredBrowsers, errorGroupTests})
        );

        return (
            <div className="sections">
                {visibleSuiteIds.map((suiteId) => {
                    const sectionProps = {
                        key: suiteId,
                        suite: suites[suiteId],
                        testNameFilter,
                        filteredBrowsers,
                        errorGroupTests
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

export default connect(
    (state) => {
        const {testNameFilter, filteredBrowsers, lazyLoadOffset} = state.view;

        return ({
            suiteIds: state.suiteIds[state.view.viewMode],
            testNameFilter,
            filteredBrowsers,
            lazyLoadOffset,
            suites: state.suites
        });
    }
)(Suites);
