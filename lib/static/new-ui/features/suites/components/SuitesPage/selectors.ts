import {createSelector} from 'reselect';
import {
    getAllRootGroupIds,
    getBrowsers,
    getBrowsersState,
    getGroups,
    getImages,
    getResults,
    getSortTestsData,
    getSuites,
    getTreeViewMode
} from '@/static/new-ui/store/selectors';
import {buildTreeBottomUp, collectTreeLeafIds, formatEntityToTreeNodeData, sortTreeNodes} from './utils';
import {TestStatus} from '@/constants';
import {TreeViewData} from '@/static/new-ui/components/TreeView';

// Converts the existing store structure to the one that can be consumed by GravityUI
export const getSuitesThreeViewData = createSelector(
    [getGroups, getSuites, getAllRootGroupIds, getBrowsers, getBrowsersState, getResults, getImages, getTreeViewMode, getSortTestsData],
    (groups, suites, rootGroupIds, browsers, browsersState, results, images, treeViewMode, sortTestsData): TreeViewData => {
        const currentSortDirection = sortTestsData.currentDirection;
        const currentSortExpression = sortTestsData.availableExpressions
            .find(expr => expr.id === sortTestsData.currentExpressionIds[0])
            ?? sortTestsData.availableExpressions[0];

        const entitiesContext = {results, images, suites, treeViewMode, browsersState, browsers, groups, currentSortDirection, currentSortExpression};

        const isGroupingEnabled = rootGroupIds.length > 0;
        if (isGroupingEnabled) {
            const treeNodes = rootGroupIds
                .map(rootId => {
                    const groupEntity = groups[rootId];

                    const browserEntities = groupEntity.browserIds.flatMap(browserId => browsersState[browserId].shouldBeShown ? [browsers[browserId]] : []);
                    const groupNodeData = formatEntityToTreeNodeData(entitiesContext, groupEntity, groupEntity.id);

                    const suitesTreeRoot = buildTreeBottomUp(entitiesContext, browserEntities, groupNodeData);

                    return {
                        data: groupNodeData,
                        children: suitesTreeRoot.children
                    };
                })
                .filter(treeNode => treeNode.children?.length);

            const sortedTreeNodes = sortTreeNodes(entitiesContext, treeNodes);
            const {allTreeNodeIds, visibleTreeNodeIds} = collectTreeLeafIds(sortedTreeNodes);

            return {
                tree: sortedTreeNodes,
                allTreeNodeIds,
                visibleTreeNodeIds
            };
        }

        const suitesTreeRoot = buildTreeBottomUp(entitiesContext, Object.values(browsers).filter(browser => browsersState[browser.id].shouldBeShown));
        suitesTreeRoot.children = sortTreeNodes(entitiesContext, suitesTreeRoot.children ?? []);
        const {allTreeNodeIds, visibleTreeNodeIds} = collectTreeLeafIds([suitesTreeRoot]);

        return {
            allTreeNodeIds,
            visibleTreeNodeIds,
            tree: suitesTreeRoot.children ?? []
        };
    });

export interface SuitesStatusCounts {
    success: number;
    fail: number;
    skipped: number;
    total: number;
    retried: number;
    retries: number;
    idle: number;
}

export const getSuitesStatusCounts = createSelector(
    [getResults, getBrowsersState],
    (results, browsersState) => {
        const latestAttempts: Record<string, {attempt: number; status: string, timestamp: number}> = {};
        const retriedTests = new Set<string>();

        let retries = 0;
        Object.values(results).forEach(result => {
            const {parentId: testId, attempt, status, timestamp} = result;
            if (!browsersState[testId].shouldBeShown && !browsersState[testId].isHiddenBecauseOfStatus) {
                return;
            }
            if (attempt > 0) {
                retriedTests.add(testId);
            }
            if (!latestAttempts[testId] || latestAttempts[testId].timestamp < timestamp) {
                retries -= latestAttempts[testId]?.attempt ?? 0;
                retries += attempt;

                latestAttempts[testId] = {attempt, status, timestamp};
            }
        });

        const counts: SuitesStatusCounts = {
            success: 0,
            fail: 0,
            skipped: 0,
            total: Object.keys(latestAttempts).length,
            retried: retriedTests.size,
            retries,
            idle: 0
        };

        Object.values(latestAttempts).forEach(({status: resultStatus}) => {
            const status = resultStatus === TestStatus.ERROR ? 'fail' : resultStatus;
            if (Object.prototype.hasOwnProperty.call(counts, status)) {
                counts[status as keyof SuitesStatusCounts]++;
            }
        });

        return counts;
    }
);
