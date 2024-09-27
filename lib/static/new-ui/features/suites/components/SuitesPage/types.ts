import {TestStatus} from '@/constants';
import {ImageFile} from '@/types';

export interface TreeViewItem<T> {
    data: T;
    children?: TreeViewItem<T>[];
}

export enum TreeViewItemType {
    Suite,
    Browser,
}

export interface TreeViewSuiteData {
    type: TreeViewItemType.Suite;
    title: string;
    fullTitle: string;
    status: TestStatus;
}

export interface TreeViewBrowserData {
    type: TreeViewItemType.Browser;
    title: string;
    fullTitle: string;
    status: TestStatus;
    errorTitle?: string;
    errorStack?: string;
    diffImg?: ImageFile;
}

export type TreeViewData = TreeViewSuiteData | TreeViewBrowserData;
