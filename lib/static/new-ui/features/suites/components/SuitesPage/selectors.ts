import {createSelector} from 'reselect';
import {
    getAllRootGroupIds,
    getBrowsers,
    getBrowsersList,
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
import {getCurrentResult} from '@/static/new-ui/features/suites/selectors';
import {hasBrowsers, hasSuites, SortDirection, SortType, State, TreeViewMode} from '@/static/new-ui/types/store';
import type {TreePatch} from '@/tests-tree-builder/tree-patch';
import {EntityType, TreeNode} from './types';

let previousTreeViewData: TreeViewData | undefined;
let previousTreePatch: TreePatch | undefined;

const getLastTreePatch = (state: State): TreePatch | undefined => (
    (state.tree as State['tree'] & {lastPatch?: TreePatch}).lastPatch
);

const collectRootBrowserIds = (rootIds: string[], suites: ReturnType<typeof getSuites>): string[] => {
    const browserIds = new Set<string>();
    const pendingSuiteIds = [...rootIds];

    while (pendingSuiteIds.length) {
        const suite = suites[pendingSuiteIds.pop() as string];
        if (!suite) {
            continue;
        }

        if (hasBrowsers(suite)) {
            suite.browserIds.forEach(id => browserIds.add(id));
        }
        if (hasSuites(suite)) {
            pendingSuiteIds.push(...suite.suiteIds);
        }
    }

    return [...browserIds];
};

const reuseUnaffectedNodes = (newNodes: TreeNode[], previousNodes: TreeNode[], treePatch: TreePatch): TreeNode[] => {
    const previousByEntityId = new Map<string, TreeNode>();
    const affectedSuiteIds = new Set(treePatch.affectedSuiteIds);
    const affectedBrowserIds = new Set(Object.keys(treePatch.browsers.byId));
    const indexPreviousNodes = (nodes: TreeNode[]): void => nodes.forEach((node) => {
        previousByEntityId.set(`${node.data.entityType}:${node.data.entityId}`, node);
        indexPreviousNodes(node.children ?? []);
    });

    indexPreviousNodes(previousNodes);

    const reuseNode = (node: TreeNode): TreeNode => {
        const previousNode = previousByEntityId.get(`${node.data.entityType}:${node.data.entityId}`);
        const isAffected = node.data.entityType === EntityType.Suite
            ? affectedSuiteIds.has(node.data.entityId)
            : affectedBrowserIds.has(node.data.entityId);

        if (previousNode && !isAffected) {
            return previousNode;
        }

        if (!node.children) {
            return node;
        }

        return {...node, children: node.children.map(reuseNode)};
    };

    return newNodes.map(reuseNode);
};

// Converts the existing store structure to the one that can be consumed by GravityUI
export const getSuitesTreeViewData = createSelector(
    [getGroups, getSuites, getAllRootGroupIds, getBrowsers, getBrowsersState, getResults, getImages, getTreeViewMode, getSortTestsData, getBrowsersList, getLastTreePatch],
    (groups, suites, rootGroupIds, browsers, browsersState, results, images, treeViewMode, sortTestsData, browsersList, treePatch): TreeViewData => {
        const selectorStartedAt = performance.now();
        const shouldMeasure = Boolean(treePatch && treePatch !== previousTreePatch);
        const performanceId = treePatch?.performance?.id ?? '?';
        const logStage = (operation: string, startedAt: number, details?: Record<string, unknown>): void => {
            if (!shouldMeasure) {
                return;
            }

            console.info(
                `[watch-perf][client][#${performanceId}][selector] ${operation}: ${(performance.now() - startedAt).toFixed(1)}ms`,
                details ?? ''
            );
        };
        const currentSortDirection = sortTestsData.currentDirection;
        const currentSortExpression = sortTestsData.availableExpressions
            .find(expr => expr.id === sortTestsData.currentExpressionIds[0])
            ?? sortTestsData.availableExpressions[0];

        const entitiesContext = {results, images, suites, treeViewMode, browsersState, browsers, groups, currentSortDirection, currentSortExpression, browsersList};

        const isGroupingEnabled = rootGroupIds.length > 0;

        if (
            previousTreeViewData &&
            treePatch &&
            treePatch !== previousTreePatch &&
            !isGroupingEnabled &&
            treeViewMode === TreeViewMode.Tree &&
            currentSortExpression.type === SortType.ByName
        ) {
            let stageStartedAt = performance.now();
            const affectedRootIds = new Set(treePatch.affectedRootIds);
            const unaffectedTreeNodes = previousTreeViewData.tree.filter(node => !affectedRootIds.has(node.data.entityId));
            const affectedBrowserIds = collectRootBrowserIds(treePatch.affectedRootIds, suites);
            const affectedBrowsers = affectedBrowserIds
                .filter(browserId => browsersState[browserId]?.shouldBeShown)
                .map(browserId => browsers[browserId]);
            logStage('collect affected branch', stageStartedAt, {roots: affectedRootIds.size, browsers: affectedBrowsers.length});

            stageStartedAt = performance.now();
            const affectedTreeRoot = buildTreeBottomUp(entitiesContext, affectedBrowsers);
            logStage('build affected branch', stageStartedAt);

            stageStartedAt = performance.now();
            const affectedTreeNodes = reuseUnaffectedNodes(
                sortTreeNodes(entitiesContext, affectedTreeRoot.children ?? []),
                previousTreeViewData.tree,
                treePatch
            );
            const direction = currentSortDirection === SortDirection.Desc ? -1 : 1;
            const treeNodes = [
                ...unaffectedTreeNodes,
                ...affectedTreeNodes
            ].sort((a, b) => a.data.title.join(' ').localeCompare(b.data.title.join(' ')) * direction);
            logStage('sort branch and reuse unchanged nodes', stageStartedAt);

            stageStartedAt = performance.now();
            const {allTreeNodeIds, visibleTreeNodeIds} = collectTreeLeafIds(treeNodes);
            logStage('collect derived tree ids', stageStartedAt, {all: allTreeNodeIds.length, visible: visibleTreeNodeIds.length});

            previousTreePatch = treePatch;
            previousTreeViewData = {tree: treeNodes, allTreeNodeIds, visibleTreeNodeIds};
            logStage('incremental selector total', selectorStartedAt);

            return previousTreeViewData;
        }

        if (isGroupingEnabled) {
            const fullBuildStartedAt = performance.now();
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

            previousTreePatch = treePatch;
            previousTreeViewData = {
                tree: sortedTreeNodes,
                allTreeNodeIds,
                visibleTreeNodeIds
            };
            logStage('full grouped tree rebuild', fullBuildStartedAt, {all: allTreeNodeIds.length, visible: visibleTreeNodeIds.length});
            logStage('selector total', selectorStartedAt);

            return previousTreeViewData;
        }

        const fullBuildStartedAt = performance.now();
        const suitesTreeRoot = buildTreeBottomUp(entitiesContext, Object.values(browsers).filter(browser => browsersState[browser.id].shouldBeShown));
        suitesTreeRoot.children = sortTreeNodes(entitiesContext, suitesTreeRoot.children ?? []);
        const {allTreeNodeIds, visibleTreeNodeIds} = collectTreeLeafIds([suitesTreeRoot]);

        previousTreePatch = treePatch;
        previousTreeViewData = {
            allTreeNodeIds,
            visibleTreeNodeIds,
            tree: suitesTreeRoot.children ?? []
        };
        logStage('full tree rebuild', fullBuildStartedAt, {all: allTreeNodeIds.length, visible: visibleTreeNodeIds.length});
        logStage('selector total', selectorStartedAt);

        return previousTreeViewData;
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

export const getCurrentSuiteHash = (state: State): string | null => {
    const currentResult = getCurrentResult(state);

    return state.tree.suites.byId[currentResult?.suitePath?.join(' ') || '']?.hash;
};

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
