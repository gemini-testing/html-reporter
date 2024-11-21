import {Cubes3Overlap} from '@gravity-ui/icons';
import {Box} from '@gravity-ui/uikit';
import {
    unstable_getItemRenderState as getItemRenderState,
    unstable_ListContainerView as ListContainerView,
    unstable_ListItemView as ListItemView,
    unstable_useList as useList
} from '@gravity-ui/uikit/unstable';
import {useVirtualizer} from '@tanstack/react-virtual';
import classNames from 'classnames';
import React, {forwardRef, ReactNode, useCallback, useEffect, useImperativeHandle} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {useNavigate, useParams} from 'react-router-dom';

import {EntityType, TreeViewItemData} from '@/static/new-ui/features/suites/components/SuitesPage/types';
import {TreeViewItemTitle} from '@/static/new-ui/features/suites/components/TreeViewItemTitle';
import {TreeViewItemSubtitle} from '@/static/new-ui/features/suites/components/TreeViewItemSubtitle';
import {getTreeViewItems} from '@/static/new-ui/features/suites/components/SuitesTreeView/selectors';
import {TestStatus} from '@/constants';
import {TreeViewItemIcon} from '../../../../components/TreeViewItemIcon';
import {getIconByStatus} from '@/static/new-ui/utils';
import {
    revealTreeNode,
    setCurrentTreeNode,
    setStrictMatchFilter,
    setTreeNodeExpandedState
} from '@/static/modules/actions';
import {findTreeNodeByBrowserId, getGroupId} from '@/static/new-ui/features/suites/utils';
import styles from './index.module.css';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface SuitesTreeViewProps {}

export interface SuitesTreeViewHandle {
    scrollToId: (id: string) => void;
}

export const SuitesTreeView = forwardRef<SuitesTreeViewHandle, SuitesTreeViewProps>(function SuitesTreeViewInternal(_props, ref): ReactNode {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const {suiteId} = useParams();

    const isInitialized = useSelector((state) => state.app.isInitialized);
    const currentTreeNodeId = useSelector((state) => state.app.suitesPage.currentTreeNodeId);
    const treeData = useSelector((state) => getTreeViewItems(state));
    const treeViewExpandedById = useSelector((state) => state.ui.suitesPage.expandedTreeNodesById);

    const list = useList({
        items: treeData.tree,
        withExpandedState: true,
        getItemId: item => {
            return (item as TreeViewItemData).id;
        },
        controlledState: {
            expandedById: treeViewExpandedById
        }
    });

    const parentRef = React.useRef<HTMLDivElement>(null);

    const virtualizer = useVirtualizer({
        count: list.structure.visibleFlattenIds.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 32,
        getItemKey: useCallback((index: number) => list.structure.visibleFlattenIds[index], [list]),
        overscan: 50
    });

    const virtualizedItems = virtualizer.getVirtualItems();

    useImperativeHandle(ref, () => ({
        scrollToId: (id: string): void => {
            if (!list.structure.visibleFlattenIds.includes(id)) {
                dispatch(revealTreeNode({nodeId: id}));
                setTimeout(() => {
                    try {
                        virtualizer.scrollToIndex(list.structure.visibleFlattenIds.indexOf(id), {align: 'start'});
                    } catch { /* empty */ }
                }, 50);
            } else {
                virtualizer.scrollToIndex(list.structure.visibleFlattenIds.indexOf(id), {align: 'start'});
            }
        }
    }));

    // Effects
    useEffect(() => {
        if (!isInitialized) {
            return;
        }

        dispatch(setStrictMatchFilter(false));

        let timeoutId: NodeJS.Timeout;
        if (suiteId) {
            const treeNode = findTreeNodeByBrowserId(treeData.tree, suiteId);
            if (!treeNode) {
                return;
            }

            dispatch(setCurrentTreeNode({browserId: suiteId, treeNodeId: treeNode.id}));

            // This tiny timeout helps when report contains thousands of items and scrolls to invalid position before they are done rendering.
            timeoutId = setTimeout(() => {
                virtualizer.scrollToIndex(list.structure.visibleFlattenIds.indexOf(treeNode.id), {align: 'center'});
            }, 50);
        }

        return () => clearTimeout(timeoutId);
    }, [isInitialized]);

    // Event handlers
    const onItemClick = useCallback(({id}: {id: string}): void => {
        const item = list.structure.itemsById[id];

        if (item.entityType === EntityType.Browser) {
            dispatch(setCurrentTreeNode({treeNodeId: item.id, browserId: item.entityId, groupId: getGroupId(item)}));

            navigate(encodeURIComponent(item.entityId));
        } else {
            dispatch(setTreeNodeExpandedState({nodeId: item.id, isExpanded: !(list.state.expandedById as Record<string, boolean>)[item.id]}));
        }
    }, [list, treeViewExpandedById]);

    if (list.structure.visibleFlattenIds.length === 0) {
        return <div className={styles.emptyHintContainer}>
            There are no tests that match selected filters
        </div>;
    }

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
                        const isSelected = item.id === currentTreeNodeId;
                        const classes = [
                            styles['tree-view__item'],
                            {
                                [styles['tree-view__item--current']]: isSelected,
                                [styles['tree-view__item--browser']]: item.entityType === EntityType.Browser,
                                [styles['tree-view__item--error']]: item.entityType === EntityType.Browser && (item.status === TestStatus.FAIL || item.status === TestStatus.ERROR)
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
                                            startSlot: <TreeViewItemIcon>{x.status ? getIconByStatus(x.status) : <Cubes3Overlap/>}</TreeViewItemIcon>,
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
});
