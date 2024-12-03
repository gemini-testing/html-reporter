import {
    BrowserEntity, BrowserState, GroupEntity, ImageEntity, isBrowserEntity, isGroupEntity,
    isResultEntityError,
    isSuiteEntity, ResultEntity, SortByExpression, SortDirection, SortType,
    SuiteEntity,
    TreeViewMode
} from '@/static/new-ui/types/store';
import {EntityType, TreeNode, TreeRoot} from '@/static/new-ui/features/suites/components/SuitesPage/types';
import {getEntityType} from '@/static/new-ui/features/suites/utils';
import {last} from 'lodash';
import {isAcceptable} from '@/static/modules/utils';
import {isErrorStatus, isFailStatus, trimArray} from '@/common-utils';
import {NEW_ISSUE_LINK} from '@/constants';

export const getTitlePath = (suites: Record<string, SuiteEntity>, entity: SuiteEntity | BrowserEntity | undefined): string[] => {
    if (!entity) {
        return [];
    }

    if (isSuiteEntity(entity)) {
        return entity.suitePath;
    }

    return [...getTitlePath(suites, suites[entity.parentId]), entity.name];
};

interface EntitiesContext {
    browsers: Record<string, BrowserEntity>;
    browsersState: Record<string, BrowserState>;
    results: Record<string, ResultEntity>;
    images: Record<string, ImageEntity>;
    suites: Record<string, SuiteEntity>;
    groups: Record<string, GroupEntity>;
    treeViewMode: TreeViewMode;
    currentSortDirection: SortDirection;
    currentSortExpression: SortByExpression | undefined;
}

export const formatEntityToTreeNodeData = ({browsers, browsersState, results, images, suites, treeViewMode}: EntitiesContext, entity: SuiteEntity | BrowserEntity | GroupEntity, id: string, parentData?: TreeNode['data']): TreeNode['data'] => {
    if (isSuiteEntity(entity)) {
        return {
            id,
            entityType: getEntityType(entity),
            entityId: entity.id,
            title: [entity.name],
            status: entity.status,
            parentData,
            tags: []
        };
    }

    if (isGroupEntity(entity)) {
        const browserEntities = entity.browserIds.flatMap(browserId => browsersState[browserId].shouldBeShown ? [browsers[browserId]] : []);

        const testsCount = browserEntities.length;
        const retriesCount = entity.resultIds.filter(resultId => browsersState[results[resultId].parentId].shouldBeShown).length;

        return {
            id: entity.id,
            entityType: EntityType.Group,
            entityId: entity.id,
            prefix: `${entity.key}:`,
            title: [entity.label],
            status: null,
            tags: [
                `${testsCount} ${testsCount > 1 ? ' tests' : 'test'}`,
                `${retriesCount} ${retriesCount > 1 ? ' retries' : 'retry'}`
            ]
        };
    }

    // Otherwise, it's BrowserEntity
    const lastResult = results[last(entity.resultIds) as string];

    const resultImages = lastResult.imageIds
        .map(imageId => images[imageId])
        .filter(imageEntity => isAcceptable(imageEntity));

    let errorTitle, errorStack;
    if (isResultEntityError(lastResult) && lastResult.error?.stack) {
        errorTitle = lastResult.error?.name;

        const stackLines = trimArray(lastResult.error.stack.split('\n'));
        errorStack = stackLines.slice(0, 3).join('\n');
    }

    return {
        id,
        entityType: getEntityType(entity),
        entityId: entity.id,
        title: treeViewMode === TreeViewMode.Tree ? [entity.name] : getTitlePath(suites, entity),
        status: lastResult.status,
        images: resultImages,
        errorTitle,
        errorStack,
        parentData,
        skipReason: lastResult.skipReason,
        tags: []
    };
};

export const buildTreeBottomUp = (entitiesContext: EntitiesContext, entities: (SuiteEntity | BrowserEntity)[], rootData?: TreeNode['data']): TreeRoot => {
    const {browsers, suites, browsersState, treeViewMode} = entitiesContext;

    const TREE_ROOT = Symbol();
    const cache: Record<string | symbol, TreeNode | TreeRoot> = {};

    const createTreeRoot = (): TreeRoot => ({
        isRoot: true,
        data: rootData
    });

    const build = (entity: SuiteEntity | BrowserEntity): TreeNode | TreeRoot => {
        let parentNode: TreeNode | TreeRoot;

        const {parentId} = entity;
        if (treeViewMode === TreeViewMode.Tree && parentId) {
            const parentEntity = (suites[parentId] as SuiteEntity | undefined) ?? browsers[parentId];
            parentNode = build(parentEntity);
        } else {
            if (!cache[TREE_ROOT]) {
                cache[TREE_ROOT] = createTreeRoot();
            }
            parentNode = cache[TREE_ROOT];
        }

        if (isBrowserEntity(entity) && !browsersState[entity.id].shouldBeShown) {
            return parentNode;
        }

        const nodePartialId = treeViewMode === TreeViewMode.Tree ?
            (isBrowserEntity(entity) ? entity.name : entity.suitePath[entity.suitePath.length - 1]) :
            entity.id;
        const currentId = parentNode.data ? `${parentNode.data.id}/${nodePartialId}` : nodePartialId;
        if (cache[currentId]) {
            return cache[currentId];
        }

        const currentNode: TreeNode = {
            parentNode,
            data: formatEntityToTreeNodeData(entitiesContext, entity, currentId, parentNode.data)
        };
        cache[currentId] = currentNode;

        if (parentNode) {
            if (!parentNode.children) {
                parentNode.children = [];
            }

            parentNode.children.push(currentNode);
        }

        return currentNode;
    };

    for (const entity of entities) {
        build(entity);
    }

    return cache[TREE_ROOT] as TreeRoot ?? createTreeRoot();
};

export const collectTreeLeafIds = (treeNodes: (TreeNode | TreeRoot)[]): {allTreeNodeIds: string[], visibleTreeNodeIds: string[]} => {
    const allTreeNodeIds: string[] = [];
    const visibleTreeNodeIds: string[] = [];

    const collectBrowserIdsInternal = (node: TreeNode | TreeRoot): void => {
        if (node.data && node.data.id) {
            allTreeNodeIds.push(node.data.id);
        }

        if (!node.children) {
            return;
        }

        for (const childNode of node.children) {
            if (childNode.data.entityType === EntityType.Browser) {
                visibleTreeNodeIds.push(childNode.data.id);
            } else if (childNode.children?.length) {
                collectBrowserIdsInternal(childNode);
            }
        }
    };

    treeNodes.forEach(treeNode => collectBrowserIdsInternal(treeNode));

    return {allTreeNodeIds, visibleTreeNodeIds};
};

export const sortTreeNodes = (entitiesContext: EntitiesContext, treeNodes: TreeNode[]): TreeNode[] => {
    const {groups, results, currentSortExpression, currentSortDirection, browsers} = entitiesContext;

    // Weight of a single node is an array, because sorting may be performed by multiple fields at once
    // For example, sort by tests count, but if tests counts are equal, compare retries counts
    // In this case weight for each node is [testsCount, retriesCount]
    type TreeNodeWeight = number[] | string[];

    interface TreeWeightedSortResult {
        sortedTreeNodes: TreeNode[];
        weight: TreeNodeWeight;
    }

    const extractWeight = (treeNode: TreeNode, childrenWeight?: TreeNodeWeight): TreeNodeWeight => {
        const notifyOfUnsuccessfulWeightComputation = (): void => {
            console.warn('Failed to determine suite weight for tree node listed below. Please let us now at ' + NEW_ISSUE_LINK);
            console.warn(treeNode);
        };

        switch (treeNode.data.entityType) {
            case EntityType.Group: {
                const group = groups[treeNode.data.entityId];

                return [group.browserIds.length, group.resultIds.length];
            }
            case EntityType.Suite: {
                if (!currentSortExpression || currentSortExpression.type === SortType.ByName) {
                    return [treeNode.data.title.join(' ')];
                } else if (currentSortExpression.type === SortType.ByRetries) {
                    if (!childrenWeight) {
                        notifyOfUnsuccessfulWeightComputation();
                        return [0];
                    }

                    return childrenWeight;
                }
                break;
            }
            case EntityType.Browser: {
                if (!currentSortExpression || currentSortExpression.type === SortType.ByName) {
                    return [treeNode.data.title.join(' ')];
                } else if (currentSortExpression.type === SortType.ByRetries) {
                    const browser = browsers[treeNode.data.entityId];
                    return [browser.resultIds.filter(resultId => isFailStatus(results[resultId].status) || isErrorStatus(results[resultId].status)).length];
                }
                break;
            }
        }

        notifyOfUnsuccessfulWeightComputation();
        return [0];
    };

    const aggregateWeights = (weights: TreeNodeWeight[]): TreeNodeWeight => {
        if (!currentSortExpression || currentSortExpression.type === SortType.ByName) {
            return [0];
        }

        if (currentSortExpression.type === SortType.ByRetries) {
            return weights.reduce((acc, weight) => {
                const newAcc = acc.slice(0);
                for (let i = 0; i < weight.length; i++) {
                    newAcc[i] = (acc[i] ?? 0) + weight[i];
                }
                return newAcc;
            }, new Array(weights[0]?.length));
        }

        return [0];
    };

    // Recursive tree sort. At each level of the tree, it does the following:
    // 1. Compute weights of the current branch
    // 2. Sort current level according to weights
    // 3. Return sorted current level and aggregate of all weights at current level
    const sortAndGetWeight = (treeNodes: TreeNode[]): TreeWeightedSortResult => {
        const treeNodesCopy = treeNodes.slice(0);
        const weights: Record<string, TreeNodeWeight> = {};

        treeNodesCopy.forEach((treeNode, index) => {
            if (treeNode.data.entityType === EntityType.Group && treeNode.children?.length) {
                treeNodesCopy[index] = Object.assign({}, treeNode, {
                    children: sortAndGetWeight(treeNode.children).sortedTreeNodes
                });

                weights[treeNode.data.id] = extractWeight(treeNode);
            } else if (treeNode.data.entityType === EntityType.Suite && treeNode.children?.length) {
                const sortResult = sortAndGetWeight(treeNode.children);
                const newTreeNode = Object.assign({}, treeNode, {
                    children: sortResult.sortedTreeNodes
                });

                const retriesCount = Number(sortResult.weight[0]);
                if (currentSortExpression?.type === SortType.ByRetries && retriesCount > 0) {
                    newTreeNode.data.tags.push(`${retriesCount} ${retriesCount > 1 ? 'failed retries' : 'failed retry'}`);
                }
                treeNodesCopy[index] = newTreeNode;

                weights[treeNode.data.id] = extractWeight(treeNode, sortResult.weight);
            } else if (treeNode.data.entityType === EntityType.Browser) {
                const newTreeNode = Object.assign({}, treeNode);

                weights[treeNode.data.id] = extractWeight(treeNode);

                const retriesCount = weights[treeNode.data.id][0] as number;
                if (currentSortExpression?.type === SortType.ByRetries && retriesCount > 0) {
                    newTreeNode.data.tags.push(`${retriesCount} ${retriesCount > 1 ? 'failed retries' : 'failed retry'}`);
                }

                treeNodesCopy[index] = newTreeNode;
            }
        });

        const sortedTreeNodes = treeNodesCopy.sort((a, b): number => {
            const direction = currentSortDirection === SortDirection.Desc || a.data.entityType === EntityType.Group ? -1 : 1;

            for (let i = 0; i < weights[a.data.id].length; i++) {
                const aWeight = weights[a.data.id][i];
                const bWeight = weights[b.data.id][i];
                if (aWeight === bWeight) {
                    continue;
                }

                if (typeof aWeight === 'string' || typeof bWeight === 'string') {
                    return aWeight.toString().localeCompare(bWeight.toString()) * direction;
                }

                return (aWeight - bWeight) * direction;
            }

            return 0;
        });

        return {
            sortedTreeNodes: sortedTreeNodes,
            weight: aggregateWeights(Object.values(weights))
        };
    };

    return sortAndGetWeight(treeNodes).sortedTreeNodes;
};
