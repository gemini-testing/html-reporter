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
import {TreeNode} from '@/static/new-ui/features/suites/components/SuitesPage/types';
import {buildTreeBottomUp, collectTreeLeafIds, formatEntityToTreeNodeData, sortTreeNodes} from './utils';

interface TreeViewData {
    tree: TreeNode[];
    visibleTreeNodeIds: string[];
    allTreeNodeIds: string[];
}

// Converts the existing store structure to the one that can be consumed by GravityUI
export const getTreeViewItems = createSelector(
    [getGroups, getSuites, getAllRootGroupIds, getBrowsers, getBrowsersState, getResults, getImages, getTreeViewMode, getSortTestsData],
    (groups, suites, rootGroupIds, browsers, browsersState, results, images, treeViewMode, sortTestsData): TreeViewData => {
        const currentSortDirection = sortTestsData.currentDirection;
        const currentSortExpression = sortTestsData.availableExpressions.find(expr => expr.id === sortTestsData.currentExpressionIds[0]);

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
