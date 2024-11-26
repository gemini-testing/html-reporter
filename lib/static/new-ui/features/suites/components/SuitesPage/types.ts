import {TestStatus} from '@/constants';
import {ImageEntity} from '@/static/new-ui/types/store';

export enum EntityType {
    Group,
    Suite,
    Browser,
}

export interface TreeViewItemData {
    id: string;
    entityType: EntityType;
    entityId: string;
    prefix?: string;
    title: string;
    status: TestStatus | null;
    tags?: string[];
    errorTitle?: string;
    errorStack?: string;
    images?: ImageEntity[];
    parentData?: TreeViewItemData;
    skipReason?: string;
}

export interface TreeRoot {
    isRoot: true;
    data?: TreeViewItemData;
    // eslint-disable-next-line no-use-before-define
    children?: TreeNode[];
}

export interface GenericTreeViewItem<T> {
    parentNode?: TreeRoot | GenericTreeViewItem<T>;
    data: T;
    children?: GenericTreeViewItem<T>[];
}

export type TreeNode = GenericTreeViewItem<TreeViewItemData>;

export const isTreeRoot = (nodeOrRoot: TreeNode | TreeRoot): nodeOrRoot is TreeRoot => (nodeOrRoot as TreeRoot).isRoot;
