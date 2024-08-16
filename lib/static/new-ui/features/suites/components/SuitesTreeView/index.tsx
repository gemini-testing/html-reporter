import {Box} from '@gravity-ui/uikit';
import {
    unstable_getItemRenderState as getItemRenderState, unstable_ListContainerView as ListContainerView,
    unstable_ListItemView as ListItemView, unstable_useList as useList
} from '@gravity-ui/uikit/unstable';
import {useVirtualizer} from '@tanstack/react-virtual';
import classNames from 'classnames';
import React, {ReactNode, useCallback, useEffect} from 'react';
import {connect} from 'react-redux';
import {useNavigate, useParams} from 'react-router-dom';
import {bindActionCreators} from 'redux';

import * as actions from '@/static/modules/actions';
import {
    TreeViewBrowserData,
    TreeViewItem,
    TreeViewItemType,
    TreeViewSuiteData
} from '@/static/new-ui/features/suites/components/SuitesPage/types';
import {getIconByStatus} from '@/static/new-ui/utils';
import {TreeViewItemTitle} from '@/static/new-ui/features/suites/components/TreeViewItemTitle';
import {TreeViewItemSubtitle} from '@/static/new-ui/features/suites/components/TreeViewItemSubtitle';
import {State} from '@/static/new-ui/types/store';
import {
    getTreeViewExpandedById,
    getTreeViewItems
} from '@/static/new-ui/features/suites/components/SuitesTreeView/selectors';
import styles from './index.module.css';

interface SuitesTreeViewProps {
    treeViewItems: TreeViewItem<TreeViewSuiteData | TreeViewBrowserData>[];
    treeViewExpandedById: Record<string, boolean>;
    actions: typeof actions;
    isInitialized: boolean;
    currentSuiteId: string | null;
}

function SuitesTreeViewInternal(props: SuitesTreeViewProps): ReactNode {
    const navigate = useNavigate();
    const {suiteId} = useParams();

    const list = useList({
        items: props.treeViewItems,
        withExpandedState: true,
        getItemId: item => {
            return item.fullTitle;
        },
        controlledState: {
            expandedById: props.treeViewExpandedById
        }
    });

    const parentRef = React.useRef<HTMLDivElement>(null);

    const virtualizer = useVirtualizer({
        count: list.structure.visibleFlattenIds.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 28,
        getItemKey: useCallback((index: number) => list.structure.visibleFlattenIds[index], [list]),
        overscan: 200
    });

    const virtualizedItems = virtualizer.getVirtualItems();

    // Effects
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

    // Event handlers
    const onItemClick = useCallback(({id}: {id: string}): void => {
        const item = list.structure.itemsById[id];

        if (item.type === TreeViewItemType.Suite && list.state.expandedById && id in list.state.expandedById && list.state.setExpanded) {
            props.actions.toggleSuiteSection({suiteId: item.fullTitle, shouldBeOpened: !props.treeViewExpandedById[item.fullTitle]});
        } else if (item.type === TreeViewItemType.Browser) {
            props.actions.suitesPageSetCurrentSuite(id);

            navigate(encodeURIComponent(item.fullTitle));
        }
    }, [list, props.actions, props.treeViewExpandedById]);

    return <ListContainerView className={styles.treeView}>
        <div ref={parentRef} className={styles['tree-view__container']}>
            <div
                className={styles['tree-view__total-size-wrapper']}
                style={{height: virtualizer.getTotalSize()}}
            >
                <div
                    className={styles['tree-view__visible-window']}
                    style={{transform: `translateY(${virtualizedItems[0]?.start ?? 0}px)`}}
                >
                    {virtualizedItems.map((virtualRow) => {
                        const item = list.structure.itemsById[virtualRow.key];
                        const classes = [styles['tree-view__item']];
                        if (item.fullTitle === props.currentSuiteId) {
                            classes.push(styles['tree-view__item--current']);
                        } else if ((item.status === 'fail' || item.status === 'error') && item.type === TreeViewItemType.Browser) {
                            classes.push(styles['tree-view__item--error']);
                        }
                        if (item.type === TreeViewItemType.Browser) {
                            classes.push(styles['tree-view__item--browser']);
                        }

                        return <Box
                            key={virtualRow.key}
                            data-index={virtualRow.index}
                            ref={virtualizer.measureElement}
                            spacing={{pt: 1}}
                        >
                            <ListItemView
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
                                }).props}/>
                        </Box>;
                    })}
                </div>
            </div>
        </div>
    </ListContainerView>;
}

export const SuitesTreeView = connect((state: State) => ({
    isInitialized: state.app.isInitialized,
    currentSuiteId: state.app.currentSuiteId,
    treeViewItems: getTreeViewItems(state),
    treeViewExpandedById: getTreeViewExpandedById(state)
}),
(dispatch) => ({actions: bindActionCreators(actions, dispatch)}))(SuitesTreeViewInternal);
