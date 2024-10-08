import {Box} from '@gravity-ui/uikit';
import {
    unstable_getItemRenderState as getItemRenderState,
    unstable_ListContainerView as ListContainerView,
    unstable_ListItemView as ListItemView,
    unstable_useList as useList
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
    TreeViewItemType,
    TreeViewSuiteData
} from '@/static/new-ui/features/suites/components/SuitesPage/types';
import {TreeViewItemTitle} from '@/static/new-ui/features/suites/components/TreeViewItemTitle';
import {TreeViewItemSubtitle} from '@/static/new-ui/features/suites/components/TreeViewItemSubtitle';
import {State} from '@/static/new-ui/types/store';
import {
    getTreeViewExpandedById,
    getTreeViewItems
} from '@/static/new-ui/features/suites/components/SuitesTreeView/selectors';
import styles from './index.module.css';
import {TestStatus} from '@/constants';
import {TreeViewItemIcon} from '../../../../components/TreeViewItemIcon';
import {getIconByStatus} from '@/static/new-ui/utils';
import {TreeViewItem} from '@/static/new-ui/types';

interface SuitesTreeViewProps {
    treeViewItems: TreeViewItem<TreeViewSuiteData | TreeViewBrowserData>[];
    treeViewExpandedById: Record<string, boolean>;
    actions: typeof actions;
    isInitialized: boolean;
    currentBrowserId: string | null;
}

function SuitesTreeViewInternal(props: SuitesTreeViewProps): ReactNode {
    const navigate = useNavigate();
    const {browserId} = useParams();

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
        if (!props.isInitialized) {
            return;
        }

        props.actions.setStrictMatchFilter(false);

        if (browserId) {
            props.actions.suitesPageSetCurrentSuite(browserId);
            virtualizer.scrollToIndex(list.structure.visibleFlattenIds.indexOf(browserId), {align: 'start'});
        }
    }, [props.isInitialized]);

    // Event handlers
    const onItemClick = useCallback(({id}: {id: string}): void => {
        const item = list.structure.itemsById[id];

        if (item.type === TreeViewItemType.Suite) {
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
                        const isSelected = item.fullTitle === props.currentBrowserId;
                        const classes = [
                            styles['tree-view__item'],
                            {
                                [styles['tree-view__item--current']]: isSelected,
                                [styles['tree-view__item--browser']]: item.type === TreeViewItemType.Browser,
                                [styles['tree-view__item--error']]: item.type === TreeViewItemType.Browser && (item.status === TestStatus.FAIL || item.status === TestStatus.ERROR)
                            }
                        ];

                        return <Box
                            key={virtualRow.key}
                            data-index={virtualRow.index}
                            ref={virtualizer.measureElement}
                            spacing={{pt: 1}}
                        >
                            <ListItemView
                                height={0} // To prevent GravityUI from setting incorrect min-height
                                className={classNames(classes)}
                                {...getItemRenderState({
                                    id: virtualRow.key.toString(),
                                    list,
                                    onItemClick,
                                    mapItemDataToContentProps: (x) => {
                                        return {
                                            startSlot: <TreeViewItemIcon>{getIconByStatus(x.status)}</TreeViewItemIcon>,
                                            title: <TreeViewItemTitle item={x} className={isSelected ? styles['tree-view__item__title--current'] : ''} />,
                                            subtitle: <TreeViewItemSubtitle item={x} className={isSelected ? styles['tree-view__item__error--current'] : ''} scrollContainerRef={parentRef}/>
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
    currentBrowserId: state.app.suitesPage.currentBrowserId,
    treeViewItems: getTreeViewItems(state).tree,
    treeViewExpandedById: getTreeViewExpandedById(state)
}),
(dispatch) => ({actions: bindActionCreators(actions, dispatch)}))(SuitesTreeViewInternal);
