import {EntityType, TreeNode, TreeViewItemData} from '@/static/new-ui/features/suites/components/SuitesPage/types';
import {BrowserEntity, isBrowserEntity, SuiteEntity} from '@/static/new-ui/types/store';

export const getGroupId = (item: TreeViewItemData): string | null => {
    let groupId = null;
    let currentItem: TreeViewItemData | undefined = item;
    while (currentItem) {
        if (currentItem.entityType === EntityType.Group) {
            groupId = currentItem.entityId;
            break;
        }
        currentItem = currentItem.parentData;
    }

    return groupId;
};

export const getEntityType = (entity: SuiteEntity | BrowserEntity): EntityType => {
    if (isBrowserEntity(entity)) {
        return EntityType.Browser;
    }

    return EntityType.Suite;
};

export const findTreeNode = (nodes: TreeNode[], predicate: (node: TreeNode) => boolean): TreeViewItemData | null => {
    for (const node of nodes) {
        if (predicate(node)) {
            return node.data;
        }
        if (node.children) {
            const foundNode = findTreeNode(node.children, predicate);
            if (foundNode) {
                return foundNode;
            }
        }
    }
    return null;
};

export const findTreeNodeByBrowserId = (nodes: TreeNode[], targetBrowserId: string): TreeViewItemData | null => {
    return findTreeNode(
        nodes,
        (node) => node.data.entityType === EntityType.Browser && node.data.entityId === targetBrowserId
    );
};

export const findTreeNodeById = (nodes: TreeNode[], nodeId: string): TreeViewItemData | null => {
    return findTreeNode(
        nodes,
        (node) => node.data.id === nodeId
    );
};

export const isSectionHidden = (sizeInPercent: number): boolean => sizeInPercent < 1;
