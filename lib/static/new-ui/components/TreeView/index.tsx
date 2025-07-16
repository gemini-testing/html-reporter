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
import React, {forwardRef, ReactNode, useCallback, useImperativeHandle} from 'react';
import {useDispatch} from 'react-redux';

import {EntityType, TreeNode, TreeViewItemData} from '@/static/new-ui/features/suites/components/SuitesPage/types';
import {TreeViewItemTitle} from '@/static/new-ui/components/TreeViewItemTitle';
import {TreeViewItemSubtitle} from '@/static/new-ui/components/TreeViewItemSubtitle';
import {TestStatus} from '@/constants';
import {TreeViewItemIcon} from '@/static/new-ui/components/TreeViewItemIcon';
import {getIconByStatus} from '@/static/new-ui/utils';
import {revealTreeNode} from '@/static/modules/actions';

import styles from './index.module.css';

export interface TreeViewData {
    tree: TreeNode[];
    visibleTreeNodeIds: string[];
    allTreeNodeIds: string[];
}

export interface TreeViewProps {
    currentTreeNodeId: string | null;
    treeData: TreeViewData;
    treeViewExpandedById: Record<string, boolean>;
    onClick: (item: TreeViewItemData, expanded: boolean) => void;
}

export interface TreeViewHandle {
    scrollToId: (id: string) => void;
}

export const TreeView = forwardRef<TreeViewHandle, TreeViewProps>(function TreeViewInternal(props, ref): ReactNode {
    const {currentTreeNodeId, treeData, treeViewExpandedById, onClick} = props;
    const dispatch = useDispatch();

    const list = useList({
        items: treeData.tree,
        withExpandedState: true,
        getItemId: (item: TreeViewItemData) => item.id,
        controlledState: {
            expandedById: treeViewExpandedById
        }
    });

    // Event handlers
    const onItemClick = useCallback(({id}: {id: string}): void => {
        const item = list.structure.itemsById[id];

        onClick(item, (list.state.expandedById as Record<string, boolean>)[id]);
    }, [list, treeViewExpandedById]);

    const parentRef = React.useRef<HTMLDivElement>(null);

    const virtualizer = useVirtualizer({
        count: list.structure.visibleFlattenIds.length,
        getScrollElement: () => parentRef.current,
        estimateSize: (index) => {
            const id = list.structure.visibleFlattenIds[index];
            const item = list.structure.itemsById[id];

            // Groups on average take 3 lines: 2 lines of text (clamped) + 1 line for tags -> 73px in total
            // Regular items on average take 1 line -> 32px
            // Providing more precise estimates here greatly improves scrolling performance
            const GROUP_ROW_HEIGHT = 73;
            const REGULAR_ROW_HEIGHT = 32;

            return item.entityType === EntityType.Group ? GROUP_ROW_HEIGHT : REGULAR_ROW_HEIGHT;
        },
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
                        virtualizer.scrollToIndex(list.structure.visibleFlattenIds.indexOf(id), {align: 'auto'});
                    } catch { /* empty */ }
                }, 50);
            } else {
                virtualizer.scrollToIndex(list.structure.visibleFlattenIds.indexOf(id), {align: 'auto'});
            }
        }
    }));

    if (list.structure.visibleFlattenIds.length === 0) {
        return <div className={styles.emptyHintContainer}>
            There are no tests that match selected filters
        </div>;
    }

    return (
        <ListContainerView className={styles.treeView}>
            <div ref={parentRef} className={styles['tree-view__container']}>
                <div
                    className={styles['tree-view__total-size-wrapper']}
                    style={{height: virtualizer.getTotalSize()}}
                >
                    <div
                        className={styles['tree-view__visible-window']}
                        style={{transform: `translateY(${virtualizedItems[0]?.start ?? 0}px)`}}
                        data-qa="tree-view-list"
                    >
                        {virtualizedItems.map((virtualRow) => {
                            const item = list.structure.itemsById[virtualRow.key as string];
                            const isSelected = item.id === currentTreeNodeId;
                            const classes = [
                                styles['tree-view__item'],
                                {
                                    // Global classes are useful for deeply nested elements like tags
                                    'current-tree-node': isSelected,
                                    'error-tree-node': item.entityType === EntityType.Browser && (item.status === TestStatus.FAIL || item.status === TestStatus.ERROR),
                                    [styles['tree-view__item--current']]: isSelected,
                                    [styles['tree-view__item--browser']]: item.entityType === EntityType.Browser,
                                    [styles['tree-view__item--error']]: item.entityType === EntityType.Browser && (item.status === TestStatus.FAIL || item.status === TestStatus.ERROR)
                                }
                            ];

                            return (
                                <Box
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
                                            mapItemDataToContentProps: (x: TreeViewItemData) => {
                                                return {
                                                    startSlot: <TreeViewItemIcon>{x.status ? getIconByStatus(x.status) : <Cubes3Overlap/>}</TreeViewItemIcon>,
                                                    title: <TreeViewItemTitle item={x} className={isSelected ? styles['tree-view__item__title--current'] : ''} />,
                                                    subtitle: <TreeViewItemSubtitle item={x} className={isSelected ? styles['tree-view__item__error--current'] : ''} scrollContainerRef={parentRef}/>
                                                };
                                            }
                                        }).props}/>
                                </Box>
                            );
                        })}
                    </div>
                </div>
            </div>
        </ListContainerView>
    );
});
