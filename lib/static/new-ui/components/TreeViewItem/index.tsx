import {Box} from '@gravity-ui/uikit';
import {
    unstable_getItemRenderState as getItemRenderState,
    unstable_ListItemView as ListItemView,
    unstable_UseListResult as UseListResult
} from '@gravity-ui/uikit/unstable';
import classNames from 'classnames';
import React, {ReactNode} from 'react';

import styles from './index.module.css';

export interface ListItemViewContentType {
    title: React.ReactNode;
    subtitle?: React.ReactNode;
    startSlot?: React.ReactNode;
    endSlot?: React.ReactNode;
}

interface TreeListItemProps<T> {
    className?: string;
    id: string;
    list: UseListResult<T>;
    mapItemDataToContentProps: (data: T) => ListItemViewContentType;
    isFailed?: boolean;
    onItemClick?: (data: {id: string}) => unknown;
}

export function TreeViewItem<T>(props: TreeListItemProps<T>): ReactNode {
    const indent = props.list.structure.itemsState[props.id].indentation;
    const hasChildren = (props.list.structure.itemsById[props.id] as {hasChildren?: boolean}).hasChildren;

    return <Box
        spacing={{pt: 1}}
    >
        <ListItemView
            className={classNames([styles.treeViewItem, {
                [styles['tree-view-item--error']]: props.isFailed
            }])}
            activeOnHover={true}
            style={{'--indent': indent + Number(!hasChildren)} as React.CSSProperties}
            {...getItemRenderState({
                id: props.id,
                list: props.list,
                onItemClick: props.onItemClick,
                mapItemDataToContentProps: (item) => {
                    return {
                        indentation: 0,
                        ...props.mapItemDataToContentProps(item)
                    };
                }
            }).props}
        />
    </Box>;
}
