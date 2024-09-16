import {unstable_ListTreeItemType as ListTreeItemType, unstable_UseListResult as UseListResult} from '@gravity-ui/uikit/unstable';
import React from 'react';

export const traverseTree = <T>(treeItems: ListTreeItemType<T>[], cb: (item: ListTreeItemType<T>) => unknown): void => {
    function dfs(step: ListTreeItemType<T>): void {
        cb(step);

        if (step.children) {
            for (const child of step.children) {
                dfs(child);
            }
        }
    }

    for (const step of treeItems) {
        dfs(step);
    }
};

export const getIndentStyle = (list: UseListResult<unknown>, id: string): React.CSSProperties => {
    return {'--indent': list.structure.itemsState[id].indentation} as React.CSSProperties;
};
