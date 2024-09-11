import {unstable_ListTreeItemType as ListTreeItemType} from '@gravity-ui/uikit/unstable';

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
