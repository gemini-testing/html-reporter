import React, {ChangeEvent, useCallback, useEffect, useState} from 'react';
import {Flex, TextInput} from '@gravity-ui/uikit';
import {debounce} from 'lodash';
import classNames from 'classnames';
import {connect} from 'react-redux';
import {
    unstable_useList as useList,
    unstable_ListContainerView as ListContainerView,
    unstable_ListItemView as ListItemView,
    unstable_getItemRenderState as getItemRenderState
} from '@gravity-ui/uikit/unstable';

import styles from './index.module.css';
import {useVirtualizer} from '@tanstack/react-virtual';
import {bindActionCreators} from 'redux';
import {State} from '@/static/new-ui/types/store';
import {
    getTreeViewExpandedById,
    getTreeViewItems
} from '@/static/new-ui/features/suites/components/SuitesPage/selectors';
import {
    TreeViewBrowserData,
    TreeViewItem, TreeViewItemType,
    TreeViewSuiteData
} from '@/static/new-ui/features/suites/components/SuitesPage/types';
import {SplitViewLayout} from '@/static/new-ui/components/SplitViewLayout';
import {getIconByStatus} from '@/static/new-ui/utils';
import {TreeViewItemTitle} from '@/static/new-ui/features/suites/components/TreeViewItemTitle';
import {TreeViewItemSubtitle} from '@/static/new-ui/features/suites/components/TreeViewItemSubtitle';
import * as actions from '@/static/modules/actions';
import {useNavigate, useParams} from 'react-router-dom';

interface SuitesPageInternalProps {
    treeViewItems: TreeViewItem<TreeViewSuiteData | TreeViewBrowserData>[];
    treeViewExpandedById: Record<string, boolean>;
    actions: typeof actions;
    isInitialized: boolean;
    currentSuiteId: string | null;
    testNameFilter: string;
}

function SuitesPageInternal(props: SuitesPageInternalProps): JSX.Element {
    const navigate = useNavigate();
    const {suiteId} = useParams();
    const itemsOriginal = props.treeViewItems;

    const list = useList({
        items: itemsOriginal,
        withExpandedState: true,
        getItemId: item => {
            return item.fullTitle;
        },
        controlledState: {
            expandedById: props.treeViewExpandedById
        }
    });

    const onItemClick = ({id}: {id: string}): void => {
        const item = list.structure.itemsById[id];

        if (item.type === TreeViewItemType.Suite && list.state.expandedById && id in list.state.expandedById && list.state.setExpanded) {
            props.actions.toggleSuiteSection({suiteId: item.fullTitle, shouldBeOpened: !props.treeViewExpandedById[item.fullTitle]});
        } else if (item.type === TreeViewItemType.Browser) {
            props.actions.suitesPageSetCurrentSuite(id);

            navigate(encodeURIComponent(item.fullTitle));
        }
    };

    const updateTestNameFilter = useCallback(debounce(
        (testName) => props.actions.updateTestNameFilter(testName),
        500,
        {maxWait: 3000}
    ), []);

    const parentRef = React.useRef<HTMLDivElement>(null);

    const virtualizer = useVirtualizer({
        count: list.structure.visibleFlattenIds.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 24,
        getItemKey: useCallback((index: number) => list.structure.visibleFlattenIds[index], [list]),
        overscan: 100
    });

    useEffect(() => {
        if (!suiteId && props.currentSuiteId && suiteId !== props.currentSuiteId) {
            navigate(encodeURIComponent(props.currentSuiteId));
        }
    }, []);

    useEffect(() => {
        if (!props.isInitialized) {
            return;
        }

        props.actions.setStrictMatchFilter(false);

        if (suiteId) {
            props.actions.suitesPageSetCurrentSuite(suiteId);
            virtualizer.scrollToIndex(list.structure.visibleFlattenIds.indexOf(suiteId), {align: 'start'});
        }
    }, [props.isInitialized]);

    const [testNameFilter, setTestNameFilter] = useState(props.testNameFilter);
    const onChange = (event: ChangeEvent<HTMLInputElement>): void => {
        setTestNameFilter(event.target.value);
        updateTestNameFilter(event.target.value);
    };

    const items = virtualizer.getVirtualItems();

    return <SplitViewLayout>
        <div>
            <Flex direction={'column'} spacing={{p: '2'}} style={{height: '100vh'}}>
                <h2 className="text-display-1">Suites</h2>
                <div className={styles.controlsRow}>
                    <TextInput placeholder='Search or filter' value={testNameFilter} onChange={onChange}/>
                </div>
                <ListContainerView className={styles.treeView}>
                    <div ref={parentRef} className={styles['tree-view__container']}>
                        <div
                            className={styles['tree-view__total-size-wrapper']}
                            style={{height: virtualizer.getTotalSize()}}
                        >
                            <div
                                className={styles['tree-view__visible-window']}
                                style={{transform: `translateY(${items[0]?.start ?? 0}px)`}}
                            >
                                {items.map((virtualRow) => {
                                    const item = list.structure.itemsById[virtualRow.key];
                                    const classes = [styles['tree-view__item']];
                                    if (item.fullTitle === props.currentSuiteId) {
                                        classes.push(styles['tree-item--current']);
                                    } else if ((item.status === 'fail' || item.status === 'error') && item.type === TreeViewItemType.Browser) {
                                        classes.push(styles['tree-item--error']);
                                    }
                                    if (item.type === TreeViewItemType.Browser) {
                                        classes.push(styles['tree-item--browser']);
                                    }

                                    return <ListItemView
                                        key={virtualRow.key}
                                        data-index={virtualRow.index}
                                        ref={virtualizer.measureElement}
                                        height={0}
                                        className={classNames(classes)}
                                        {...getItemRenderState({
                                            id: virtualRow.key.toString(),
                                            list,
                                            onItemClick,
                                            mapItemDataToContentProps: (x) => {
                                                return {
                                                    startSlot: getIconByStatus(x.status),
                                                    title: <TreeViewItemTitle item={x}/>,
                                                    subtitle: <TreeViewItemSubtitle item={x}/>
                                                };
                                            }
                                        }).props}/>;
                                })}
                            </div>
                        </div>
                    </div>
                </ListContainerView>
            </Flex>
        </div>
        <div></div>
    </SplitViewLayout>;
}

export const SuitesPage = connect(
    (state: State) => ({
        isInitialized: state.app.isInitialized,
        currentSuiteId: state.app.currentSuiteId,
        treeViewItems: getTreeViewItems(state),
        treeViewExpandedById: getTreeViewExpandedById(state),
        testNameFilter: state.view.testNameFilter
    }),
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(SuitesPageInternal);
