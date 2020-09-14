import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';

import SectionCommon from './section/section-common';
import clientEvents from '../../gui/constants/client-events';
import {mkGetVisibleRootSuiteIds} from '../modules/selectors/tree';

class Suites extends Component {
    static propTypes = {
        errorGroupBrowserIds: PropTypes.array,
        // from store
        visibleRootSuiteIds: PropTypes.arrayOf(PropTypes.string),
        lazyLoadOffset: PropTypes.number
    }

    render() {
        const {visibleRootSuiteIds, errorGroupBrowserIds, lazyLoadOffset} = this.props;

        return (
            <div className="sections">
                {visibleRootSuiteIds.map((suiteId) => {
                    const sectionProps = {
                        key: suiteId,
                        suiteId: suiteId,
                        errorGroupBrowserIds,
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
}

export default connect(
    () => {
        const getVisibleRootSuiteIds = mkGetVisibleRootSuiteIds();

        return (state, {errorGroupBrowserIds}) => ({
            lazyLoadOffset: state.view.lazyLoadOffset,
            visibleRootSuiteIds: getVisibleRootSuiteIds(state, {errorGroupBrowserIds})
        });
    }
)(Suites);
