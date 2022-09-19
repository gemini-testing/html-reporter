import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import {isEmpty, flatMap, find, once, throttle} from 'lodash';
import {List, AutoSizer, CellMeasurer, CellMeasurerCache, WindowScroller} from 'react-virtualized';
import ResizeObserver from 'rc-resize-observer';
import {bindActionCreators} from 'redux';

import * as actions from '../modules/actions';
import SectionCommon from './section/section-common';
import viewModes from '../../constants/view-modes';
import {getVisibleRootSuiteIds} from '../modules/selectors/tree';

class Suites extends Component {
    static propTypes = {
        // from store
        visibleRootSuiteIds: PropTypes.arrayOf(PropTypes.string),
        viewMode: PropTypes.string
    }

    _suitesMeasurementCache = new CellMeasurerCache({
        fixedWidth: true,
        defaultHeight: 40
    });

    _renderRow = ({index, key, style, parent}) => {
        const {visibleRootSuiteIds} = this.props;
        const suiteId = visibleRootSuiteIds[index];
        const sectionProps = {
            key: suiteId,
            suiteId: suiteId,
            sectionRoot: true
        };

        return (
            <CellMeasurer
                key={key}
                cache={this._suitesMeasurementCache}
                parent={parent}
                columnIndex={0}
                rowIndex={index}
            >
                {({measure}) => (
                    <div key={key} style={style} className="virtualized__row">
                        <ResizeObserver onResize={measure}>
                            <SectionCommon {...sectionProps} />
                        </ResizeObserver>
                    </div>
                )}
            </CellMeasurer>
        );
    }

    _recalculateBottomProgressBar = throttle(() => {
        const {actions} = this.props;
        const nodes = Array.from(document.querySelectorAll('.virtualized__row'));

        let visibleNode = find(nodes.slice().reverse(), (node) => {
            const rect = node.getBoundingClientRect();
            const bottomViewportWindow = document.documentElement.clientHeight - this._suitesMeasurementCache.defaultHeight;

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
    }, 100)

    _calculateInitialBottomProgressBar = once(() => setTimeout(this._recalculateBottomProgressBar, 0));

    _getSelectedFiltersInfo() {
        const {viewMode, filteredBrowsers, testNameFilter, strictMatchFilter} = this.props;
        const msgs = [];

        if (testNameFilter) {
            msgs.push(`test name should match to "${testNameFilter}" ${strictMatchFilter ? '' : 'not '}strictly;`);
        }

        if (viewMode !== viewModes.ALL) {
            msgs.push(`test should be ${viewMode} due to selected view mode;`);
        }

        if (filteredBrowsers) {
            const browsers = flatMap(filteredBrowsers, ({id, versions}) => isEmpty(versions) ? id : versions.map((version) => `${id}@${version}`));
            msgs.push(`test should run in selected browsers: ${browsers.join(', ')};`);
        }

        return msgs;
    }

    render() {
        const {visibleRootSuiteIds} = this.props;

        if (isEmpty(visibleRootSuiteIds)) {
            const selectedFiltersMsgs = this._getSelectedFiltersInfo();

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
                <WindowScroller onScroll={this._recalculateBottomProgressBar}>
                    {({height, isScrolling, onChildScroll, scrollTop}) => (
                        <AutoSizer disableHeight>
                            {({width}) => (
                                <List
                                    autoHeight
                                    height={height}
                                    width={width}
                                    isScrolling={isScrolling}
                                    onScroll={onChildScroll}
                                    scrollTop={scrollTop}
                                    onRowsRendered={this._calculateInitialBottomProgressBar}
                                    deferredMeasurementCache={this._suitesMeasurementCache}
                                    rowHeight={this._suitesMeasurementCache.rowHeight}
                                    rowCount={visibleRootSuiteIds.length}
                                    rowRenderer={this._renderRow}
                                    style={{willChange: 'auto'}} // disable `will-change: transform` to correctly render diff circle
                                />
                            )}
                        </AutoSizer>
                    )}
                </WindowScroller>
            </div>
        );
    }
}

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
