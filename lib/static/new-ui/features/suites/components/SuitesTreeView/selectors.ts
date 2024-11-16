import {createSelector} from 'reselect';
import {last} from 'lodash';
import {
    isResultEntityError,
    hasBrowsers,
    hasSuites,
    BrowserEntity,
    SuiteEntity
} from '@/static/new-ui/types/store';
import {
    TreeViewBrowserData,
    TreeViewItemType,
    TreeViewSuiteData
} from '@/static/new-ui/features/suites/components/SuitesPage/types';
import {TestStatus} from '@/constants';
import {
    getAllRootSuiteIds,
    getBrowsers, getBrowsersState,
    getImages,
    getResults,
    getSuites,
    getSuitesState
} from '@/static/new-ui/store/selectors';
import {trimArray} from '@/common-utils';
import {getFullTitleByTitleParts} from '@/static/new-ui/utils';
import {TreeViewItem} from '@/static/new-ui/types';
import {isAcceptable} from '@/static/modules/utils';

interface TreeViewData {
    tree: TreeViewItem<TreeViewSuiteData | TreeViewBrowserData>[];
    visibleBrowserIds: string[];
}

// Converts the existing store structure to the one that can be consumed by GravityUI
export const getTreeViewItems = createSelector(
    [getSuites, getSuitesState, getAllRootSuiteIds, getBrowsers, getBrowsersState, getResults, getImages],
    (suites, suitesState, rootSuiteIds, browsers, browsersState, results, images): TreeViewData => {
        const EMPTY_SUITE: TreeViewSuiteData = {
            id: '',
            type: TreeViewItemType.Suite,
            title: '',
            fullTitle: '',
            status: TestStatus.IDLE
        };

        const visibleBrowserIds: string[] = [];

        const formatBrowser = (browserData: BrowserEntity, parentSuite: TreeViewSuiteData): TreeViewItem<TreeViewBrowserData> | null => {
            // Assuming test in concrete browser always has at least one result, even never launched (idle result)
            const lastResult = results[last(browserData.resultIds) as string];

            const resultImages = lastResult.imageIds
                .map(imageId => images[imageId])
                .filter(imageEntity => isAcceptable(imageEntity));

            let errorTitle, errorStack;
            if (isResultEntityError(lastResult) && lastResult.error?.stack) {
                errorTitle = lastResult.error?.name;

                const stackLines = trimArray(lastResult.error.stack.split('\n'));
                errorStack = stackLines.slice(0, 3).join('\n');
            }

            const data: TreeViewBrowserData = {
                id: browserData.id,
                type: TreeViewItemType.Browser,
                title: browserData.name,
                fullTitle: getFullTitleByTitleParts([parentSuite.fullTitle, browserData.name]),
                status: lastResult.status,
                errorTitle,
                errorStack,
                images: resultImages
            };

            if (!browsersState[browserData.id].shouldBeShown) {
                return null;
            }

            visibleBrowserIds.push(data.fullTitle);

            return {data};
        };

        const formatSuite = (suiteData: SuiteEntity, parentSuite: TreeViewSuiteData): TreeViewItem<TreeViewSuiteData | TreeViewBrowserData> | null => {
            const data: TreeViewSuiteData = {
                id: suiteData.id,
                type: TreeViewItemType.Suite,
                title: suiteData.name,
                fullTitle: getFullTitleByTitleParts([parentSuite.fullTitle, suiteData.name]),
                status: suiteData.status
            };

            if (!suitesState[suiteData.id].shouldBeShown) {
                return null;
            }

            let children: TreeViewItem<TreeViewSuiteData | TreeViewBrowserData>[] = [];
            if (hasBrowsers(suiteData)) {
                children = suiteData.browserIds
                    .map((browserId) => formatBrowser(browsers[browserId], data))
                    .filter(Boolean) as TreeViewItem<TreeViewBrowserData>[];
            }
            if (hasSuites(suiteData)) {
                children = suiteData.suiteIds
                    .map((suiteId) => formatSuite(suites[suiteId], data))
                    .filter(Boolean) as TreeViewItem<TreeViewSuiteData | TreeViewBrowserData>[];
            }

            return {data, children};
        };

        const tree = rootSuiteIds
            .map((rootId) => {
                return formatSuite(suites[rootId], EMPTY_SUITE);
            })
            .filter(Boolean) as TreeViewItem<TreeViewSuiteData | TreeViewBrowserData>[];

        return {
            visibleBrowserIds,
            tree
        };
    });

export const getTreeViewExpandedById = createSelector(
    [getSuites, getSuitesState],
    (suites, suitesState) => {
        const result: Record<string, boolean> = {};

        for (const key of Object.keys(suites)) {
            result[key] = suitesState[key].shouldBeOpened;
        }

        return result;
    }
);
