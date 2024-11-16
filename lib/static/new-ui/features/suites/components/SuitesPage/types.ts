import {TestStatus} from '@/constants';
import {ImageEntity} from '@/static/new-ui/types/store';

export enum TreeViewItemType {
    Suite,
    Browser,
}

export interface TreeViewSuiteData {
    id: string;
    type: TreeViewItemType.Suite;
    title: string;
    fullTitle: string;
    status: TestStatus;
}

export interface TreeViewBrowserData {
    id: string;
    type: TreeViewItemType.Browser;
    title: string;
    fullTitle: string;
    status: TestStatus;
    errorTitle?: string;
    errorStack?: string;
    images?: ImageEntity[];
}

export type TreeViewData = TreeViewSuiteData | TreeViewBrowserData;
