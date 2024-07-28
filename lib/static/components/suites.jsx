import React, {useRef} from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import {isEmpty, flatMap, find, once, throttle} from 'lodash';
import {List, AutoSizer, CellMeasurer, CellMeasurerCache, WindowScroller} from 'react-virtualized';
import useResizeObserver from '@react-hook/resize-observer';
import {bindActionCreators} from 'redux';

import * as actions from '../modules/actions';
import SectionCommon from './section/section-common';
import {ViewMode} from '../../constants/view-modes';
import {getVisibleRootSuiteIds} from '../modules/selectors/tree';

function VirtualizedRow(props) {
    const resizeObserverRef = useRef(null);

    useResizeObserver(resizeObserverRef, () => props.onResize);

    return <div ref={props.onInit} style={props.style} className="virtualized__row">
        <div ref={resizeObserverRef}>
            <SectionCommon {...props.sectionProps} />
        </div>
    </div>;
}

VirtualizedRow.propTypes = {
    onInit: PropTypes.func,
    onResize: PropTypes.func,
    style: PropTypes.object,
    sectionProps: PropTypes.object
};

function Suites(props) {
    const _suitesMeasurementCache = new CellMeasurerCache({
        fixedWidth: true,
        defaultHeight: 30
    });

    const _renderRow = ({index, key, style, parent}) => {
        const {visibleRootSuiteIds} = props;
        const suiteId = visibleRootSuiteIds[index];
        const sectionProps = {
            key: suiteId,
            suiteId: suiteId,
            sectionRoot: true
        };

        return (
            <CellMeasurer
                key={key}
                cache={_suitesMeasurementCache}
                parent={parent}
                columnIndex={0}
                rowIndex={index}
            >
                {({measure, registerChild}) => {
                    return <VirtualizedRow onInit={registerChild} onResize={measure} key={key} style={style} sectionProps={sectionProps} />;
                }}
            </CellMeasurer>
        );
    };

    const _recalculateBottomProgressBar = throttle(() => {
        const {actions} = props;
        const nodes = Array.from(document.querySelectorAll('.virtualized__row'));

        let visibleNode = find(nodes.slice().reverse(), (node) => {
            const rect = node.getBoundingClientRect();
            const bottomViewportWindow = document.documentElement.clientHeight - _suitesMeasurementCache.defaultHeight;

            return rect.top > 0 && rect.top <= bottomViewportWindow;
        });

        if (!visibleNode) {
            visibleNode = find(nodes, (node) => {
                const rect = node.getBoundingClientRect();

                return rect.bottom > 0;
            });
        }

        if (!visibleNode) {
            return;
        }

        const suiteId = visibleNode.querySelector('.section__title').textContent;

        actions.updateBottomProgressBar({currentRootSuiteId: suiteId});
    }, 100);

    const _calculateInitialBottomProgressBar = once(() => setTimeout(_recalculateBottomProgressBar, 0));

    const _getSelectedFiltersInfo = () => {
        const {viewMode, filteredBrowsers, testNameFilter, strictMatchFilter} = props;
        const msgs = [];

        if (testNameFilter) {
            msgs.push(`test name should match to "${testNameFilter}" ${strictMatchFilter ? '' : 'not '}strictly;`);
        }

        if (viewMode !== ViewMode.ALL) {
            msgs.push(`test should be ${viewMode} due to selected view mode;`);
        }

        if (filteredBrowsers) {
            const browsers = flatMap(filteredBrowsers, ({id, versions}) => isEmpty(versions) ? id : versions.map((version) => `${id}@${version}`));
            msgs.push(`test should run in selected browsers: ${browsers.join(', ')};`);
        }

        return msgs;
    };

    const {visibleRootSuiteIds} = props;

    if (isEmpty(visibleRootSuiteIds)) {
        const selectedFiltersMsgs = _getSelectedFiltersInfo();

        return <div className="sections sections_type_empty">
            There are no tests that match to selected filters:
            <ul>
                {selectedFiltersMsgs.map((msg, i) => <li key={i}>{msg}</li>)}
            </ul>
            Try to change your search filters to see tests.
        </div>;
    }

    return (
        <div className="sections">
            <WindowScroller onScroll={_recalculateBottomProgressBar}>
                {({height, isScrolling, onChildScroll, scrollTop, registerChild}) => (
                    <AutoSizer disableHeight>
                        {({width}) => <div ref={el => el && registerChild(el)}>
                            <List
                                autoHeight
                                height={height}
                                width={width}
                                isScrolling={isScrolling}
                                onScroll={onChildScroll}
                                scrollTop={scrollTop}
                                onRowsRendered={_calculateInitialBottomProgressBar}
                                deferredMeasurementCache={_suitesMeasurementCache}
                                rowHeight={_suitesMeasurementCache.rowHeight}
                                rowCount={visibleRootSuiteIds.length}
                                rowRenderer={_renderRow}
                                style={{willChange: 'auto'}} // disable `will-change: transform` to correctly render diff circle
                            />
                        </div>}
                    </AutoSizer>
                )}
            </WindowScroller>
        </div>
    );
}

Suites.propTypes = {
    // from store
    visibleRootSuiteIds: PropTypes.arrayOf(PropTypes.string),
    viewMode: PropTypes.string,
    actions: PropTypes.object.isRequired,
    testNameFilter: PropTypes.string,
    strictMatchFilter: PropTypes.bool,
    filteredBrowsers: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string,
        versions: PropTypes.arrayOf(PropTypes.string)
    }))
};

export default connect(
    (state) => ({
        visibleRootSuiteIds: getVisibleRootSuiteIds(state),
        viewMode: state.view.viewMode,
        filteredBrowsers: state.view.filteredBrowsers,
        testNameFilter: state.view.testNameFilter,
        strictMatchFilter: state.view.strictMatchFilter
    }),
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(Suites);
