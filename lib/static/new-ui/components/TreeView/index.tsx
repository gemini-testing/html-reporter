import {Cubes3Overlap} from '@gravity-ui/icons';
import {
    unstable_getItemRenderState as getItemRenderState,
    unstable_ListContainerView as ListContainerView,
    unstable_ListItemView as ListItemView,
    unstable_useList as useList
} from '@gravity-ui/uikit/unstable';
import {useVirtualizer} from '@tanstack/react-virtual';
import classNames from 'classnames';
import React, {forwardRef, ReactNode, useCallback, useImperativeHandle, useMemo} from 'react';
import {useDispatch, useSelector} from 'react-redux';

import {EntityType, TreeNode, TreeViewItemData} from '@/static/new-ui/features/suites/components/SuitesPage/types';
import {TreeViewItemTitle} from '@/static/new-ui/components/TreeViewItemTitle';
import {TreeViewItemSubtitle} from '@/static/new-ui/components/TreeViewItemSubtitle';
import {TestStatus} from '@/constants';
import {TreeViewItemIcon} from '@/static/new-ui/components/TreeViewItemIcon';
import {getIconByStatus} from '@/static/new-ui/utils';
import {revealTreeNode} from '@/static/modules/actions';
import {TreeViewMode} from '@/static/new-ui/types/store';
import {getTreeViewMode} from '@/static/new-ui/store/selectors';

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
    containerClassName?: string;
}

export interface TreeViewHandle {
    scrollToId: (id: string) => void;
}

export const TreeView = forwardRef<TreeViewHandle, TreeViewProps>(function TreeViewInternal(props, ref): ReactNode {
    const {currentTreeNodeId, treeData, treeViewExpandedById, onClick, containerClassName} = props;
    const dispatch = useDispatch();
    const treeViewMode = useSelector(getTreeViewMode);

    const list = useList({
        items: treeData.tree,
        withExpandedState: true,
        getItemId: (item: TreeViewItemData) => item.id,
        controlledState: {
            expandedById: treeViewExpandedById
        }
    });

    const hasBackground = (item: TreeViewItemData, isSelected: boolean): boolean => {
        const isError = item.status === TestStatus.FAIL || item.status === TestStatus.ERROR;
        return isSelected || isError;
    };

    // These are used to visually group leaf items together using border radiuses
    const leafPositions = useMemo(() => {
        const positions: Record<string, 'first' | 'middle' | 'last' | 'single'> = {};

        const browserGroups: Map<string, string[]> = new Map();

        for (let i = 0; i < list.structure.visibleFlattenIds.length; i++) {
            const id = list.structure.visibleFlattenIds[i];
            const item = list.structure.itemsById[id];

            if (item.entityType === EntityType.Browser) {
                const groupKey = treeViewMode === TreeViewMode.List ? 'root' : (item.parentData?.id || 'root');
                if (!browserGroups.has(groupKey)) {
                    browserGroups.set(groupKey, []);
                }
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                browserGroups.get(groupKey)!.push(id);
            }
        }

        for (const [, siblingIds] of browserGroups) {
            let i = 0;
            while (i < siblingIds.length) {
                const currentId = siblingIds[i];
                const currentItem = list.structure.itemsById[currentId];
                const isCurrentSelected = currentItem.id === currentTreeNodeId;

                if (!hasBackground(currentItem, isCurrentSelected)) {
                    i++;
                    continue;
                }

                let groupEnd = i;
                while (groupEnd < siblingIds.length - 1) {
                    const nextId = siblingIds[groupEnd + 1];
                    const nextItem = list.structure.itemsById[nextId];
                    const isNextSelected = nextItem.id === currentTreeNodeId;
                    if (hasBackground(nextItem, isNextSelected)) {
                        groupEnd++;
                    } else {
                        break;
                    }
                }

                if (i === groupEnd) {
                    positions[currentId] = 'single';
                } else {
                    for (let j = i; j <= groupEnd; j++) {
                        if (j === i) {
                            positions[siblingIds[j]] = 'first';
                        } else if (j === groupEnd) {
                            positions[siblingIds[j]] = 'last';
                        } else {
                            positions[siblingIds[j]] = 'middle';
                        }
                    }
                }

                i = groupEnd + 1;
            }
        }

        return positions;
    }, [list.structure.visibleFlattenIds, list.structure.itemsById, currentTreeNodeId, treeViewMode]);

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

            // Regular items on average take 1 line -> 34px. This is just a height of the tree view item, measured by hand via DevTools.
            // We need to update this every time we change the tree view item height.
            // Providing more precise estimates here greatly improves scrolling performance!
            const REGULAR_ROW_HEIGHT = 34;
            // Group tree items on average take 3 lines: 2 lines of text (clamped) + 1 line for tags -> 68px in total
            // We can measure this value by opening the report in browser, selecting group by error message and measuring the height of the group item.
            const GROUP_ROW_HEIGHT = 68;

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
            <div ref={parentRef} className={classNames(styles['tree-view__container'], containerClassName)}>
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
                            const leafPosition = item.entityType === EntityType.Browser ? leafPositions[virtualRow.key as string] : undefined;

                            const classes = [
                                styles['tree-view__item'],
                                {
                                    'current-tree-node': isSelected,
                                    'error-tree-node': item.entityType === EntityType.Browser && (item.status === TestStatus.FAIL || item.status === TestStatus.ERROR),
                                    [styles['tree-view__item--current']]: isSelected,
                                    [styles['tree-view__item--browser']]: item.entityType === EntityType.Browser,
                                    [styles['tree-view__item--error']]: item.entityType === EntityType.Browser && (item.status === TestStatus.FAIL || item.status === TestStatus.ERROR),
                                    [styles['tree-view__item--leaf-first']]: leafPosition === 'first',
                                    [styles['tree-view__item--leaf-middle']]: leafPosition === 'middle',
                                    [styles['tree-view__item--leaf-last']]: leafPosition === 'last',
                                    [styles['tree-view__item--leaf-single']]: leafPosition === 'single'
                                }
                            ];

                            return (
                                <ListItemView
                                    key={virtualRow.key}
                                    data-qa="tree-view-item"
                                    data-index={virtualRow.index}
                                    ref={virtualizer.measureElement}
                                    height={0}
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
                            );
                        })}
                    </div>
                </div>
            </div>
        </ListContainerView>
    );
});
