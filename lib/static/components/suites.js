import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import {isEmpty, flatMap} from 'lodash';

import SectionCommon from './section/section-common';
import clientEvents from '../../gui/constants/client-events';
import viewModes from '../../constants/view-modes';
import {getVisibleRootSuiteIds} from '../modules/selectors/tree';

class Suites extends Component {
    static propTypes = {
        // from store
        visibleRootSuiteIds: PropTypes.arrayOf(PropTypes.string),
        lazyLoadOffset: PropTypes.number,
        viewMode: PropTypes.string
    }

    render() {
        const {visibleRootSuiteIds, lazyLoadOffset} = this.props;

        if (isEmpty(visibleRootSuiteIds)) {
            const selectedFiltersMsgs = this._getSelectedFiltersInfo();

            return <div className="sections sections_type_empty">
                There are no tests that match to selected filters:
                <ul>
                    {selectedFiltersMsgs.map((msg, i) => <li key={i}>{msg}</li>)}
                </ul>
                Try changing your search filters to see tests.
            </div>;
        }

        return (
            <div className="sections">
                {visibleRootSuiteIds.map((suiteId) => {
                    const sectionProps = {
                        key: suiteId,
                        suiteId: suiteId,
                        sectionRoot: true
                    };

                    if (lazyLoadOffset > 0) {
                        sectionProps.eventToUpdate = clientEvents.VIEW_CHANGED;
                        sectionProps.eventToReset = clientEvents.SUITES_VISIBILITY_CHANGED;
                    }

                    return <SectionCommon {...sectionProps} />;
                })}
            </div>
        );
    }

    _getSelectedFiltersInfo() {
        const {viewMode, filteredBrowsers, testNameFilter, strictMatchFilter} = this.props;
        const msgs = [];

        if (testNameFilter) {
            msgs.push(`test name should match to "${testNameFilter}" ${strictMatchFilter ? '' : 'not '}strictly;`);
        }

        if (viewMode === viewModes.FAILED) {
            msgs.push(`test should be failed due to selected view mode: "Show only ${viewMode}";`);
        }

        if (filteredBrowsers) {
            const browsers = flatMap(filteredBrowsers, ({id, versions}) => isEmpty(versions) ? id : versions.map((version) => `${id}@${version}`));
            msgs.push(`test should run in selected browsers: ${browsers.join(', ')};`);
        }

        return msgs;
    }
}

export default connect(
    (state) => ({
        visibleRootSuiteIds: getVisibleRootSuiteIds(state),
        lazyLoadOffset: state.view.lazyLoadOffset,
        viewMode: state.view.viewMode,
        filteredBrowsers: state.view.filteredBrowsers,
        testNameFilter: state.view.testNameFilter,
        strictMatchFilter: state.view.strictMatchFilter
    })
)(Suites);
