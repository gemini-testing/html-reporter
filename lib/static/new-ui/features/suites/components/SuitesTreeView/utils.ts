import {last} from 'lodash';

import {isErrorStatus, isFailStatus, trimArray} from '@/common-utils';
import {NEW_ISSUE_LINK} from '@/constants';
import {
    BrowserEntity,
    BrowserState,
    GroupEntity,
    ImageEntity,
    isBrowserEntity,
    isGroupEntity,
    isResultEntityError,
    isSuiteEntity,
    ResultEntity,
    SortByExpression,
    SortDirection,
    SortType,
    SuiteEntity,
    TreeViewMode
} from '@/static/new-ui/types/store';
import {EntityType, TreeNode, TreeRoot} from '@/static/new-ui/features/suites/components/SuitesPage/types';
import {getEntityType, getGroupId} from '@/static/new-ui/features/suites/utils';
import {isAcceptable} from '@/static/modules/utils';

export const getTitlePath = (suites: Record<string, SuiteEntity>, entity: SuiteEntity | BrowserEntity | undefined): string[] => {
    if (!entity) {
        return [];
    }

    if (isSuiteEntity(entity)) {
        return entity.suitePath;
    }

    return [...getTitlePath(suites, suites[entity.parentId]), entity.name];
};

export interface EntitiesContext {
    browsers: Record<string, BrowserEntity>;
    browsersState: Record<string, BrowserState>;
    results: Record<string, ResultEntity>;
    images: Record<string, ImageEntity>;
    suites: Record<string, SuiteEntity>;
    groups: Record<string, GroupEntity>;
    treeViewMode: TreeViewMode;
    currentSortDirection: SortDirection;
    currentSortExpression: SortByExpression;
}

export const formatEntityToTreeNodeData = ({results, images, suites, treeViewMode}: EntitiesContext, entity: SuiteEntity | BrowserEntity | GroupEntity, id: string, parentData?: TreeNode['data']): TreeNode['data'] => {
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
        return {
            id: entity.id,
            entityType: EntityType.Group,
            entityId: entity.id,
            prefix: `${entity.key}:`,
            title: [entity.label],
            status: null,
            tags: []
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

        const nodePartialId = treeViewMode === TreeViewMode.Tree
            ? (isBrowserEntity(entity) ? entity.name : entity.suitePath[entity.suitePath.length - 1])
            : entity.id;
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

// Weight of a single node is an array, because sorting may be performed by multiple fields at once
// For example, sort by tests count, but if tests counts are equal, compare runs counts
// In this case weight for each node is [testsCount, runsCount]
type TreeNodeWeightValue = (number | string)[];
interface WeightMetadata {
    testsCount: number;
    runsCount: number;
    failedRunsCount: number;
    duration: number;
    startTime: number;
}

interface TreeNodeWeight {
    value: TreeNodeWeightValue;
    metadata: Partial<WeightMetadata>;
}

interface TreeWeightedSortResult {
    sortedTreeNodes: TreeNode[];
    weight: TreeNodeWeight;
}

const createWeight = (value: TreeNodeWeightValue, metadata?: Partial<WeightMetadata>): TreeNodeWeight => ({
    value,
    metadata: metadata ?? {}
});

const createInvalidWeight = (treeNode?: TreeNode): TreeNodeWeight => {
    if (treeNode) {
        console.warn('Failed to determine suite weight for tree node listed below. Please let us know at ' + NEW_ISSUE_LINK);
        console.warn(treeNode);
    }

    return {value: [0], metadata: {}};
};

const extractWeight = (entitesContext: EntitiesContext, treeNode: TreeNode, childrenWeight?: TreeNodeWeight): TreeNodeWeight => {
    const {groups, browsersState, browsers, results, currentSortExpression} = entitesContext;

    switch (treeNode.data.entityType) {
        case EntityType.Group: {
            const group = groups[treeNode.data.entityId];

            const browserEntities = group.browserIds.flatMap(browserId => browsersState[browserId].shouldBeShown ? [browsers[browserId]] : []);

            const testsCount = browserEntities.length;
            const runsCount = group.resultIds.filter(resultId => browsersState[results[resultId].parentId].shouldBeShown).length;

            if (currentSortExpression.type === SortType.ByTestsCount) {
                return createWeight([0, testsCount, runsCount], {testsCount, runsCount});
            } else if (currentSortExpression.type === SortType.ByName) {
                return createWeight([treeNode.data.title.join(' '), testsCount, runsCount], {testsCount, runsCount});
            } else if (currentSortExpression.type === SortType.ByFailedRuns) {
                if (!childrenWeight) {
                    return createInvalidWeight(treeNode);
                }

                // For now, we assume there are no nested groups and suite/test weights are always 1 dimensional
                return createWeight([childrenWeight.value[0], testsCount, runsCount], Object.assign({}, {testsCount, runsCount}, childrenWeight.metadata));
            } else if (currentSortExpression.type === SortType.ByDuration) {
                if (!childrenWeight) {
                    return createInvalidWeight(treeNode);
                }

                return childrenWeight;
            } else if (currentSortExpression.type === SortType.ByStartTime) {
                if (!childrenWeight) {
                    return createInvalidWeight(treeNode);
                }

                return childrenWeight;
            }
            break;
        }
        case EntityType.Suite: {
            if (currentSortExpression.type === SortType.ByName) {
                return createWeight([treeNode.data.title.join(' ')]);
            } else if (currentSortExpression.type === SortType.ByFailedRuns) {
                if (!childrenWeight) {
                    return createInvalidWeight(treeNode);
                }

                return childrenWeight;
            } else if (currentSortExpression.type === SortType.ByTestsCount) {
                if (!childrenWeight) {
                    return createInvalidWeight(treeNode);
                }

                return childrenWeight;
            } else if (currentSortExpression.type === SortType.ByDuration) {
                if (!childrenWeight) {
                    return createInvalidWeight(treeNode);
                }

                return createWeight([childrenWeight.value[0], treeNode.data.title.join(' ')], childrenWeight.metadata);
            } else if (currentSortExpression.type === SortType.ByStartTime) {
                if (!childrenWeight) {
                    return createInvalidWeight(treeNode);
                }

                return childrenWeight;
            }
            break;
        }
        case EntityType.Browser: {
            if (currentSortExpression.type === SortType.ByName) {
                return createWeight([treeNode.data.title.join(' ')]);
            } else if (currentSortExpression.type === SortType.ByFailedRuns) {
                const browser = browsers[treeNode.data.entityId];
                const groupId = getGroupId(treeNode.data);

                const failedRunsCount = browser.resultIds.filter(resultId =>
                    (isFailStatus(results[resultId].status) || isErrorStatus(results[resultId].status)) &&
                    (!groupId || groups[groupId].resultIds.includes(resultId))
                ).length;

                return createWeight([failedRunsCount], {failedRunsCount});
            } else if (currentSortExpression.type === SortType.ByTestsCount) {
                const browser = browsers[treeNode.data.entityId];
                const groupId = getGroupId(treeNode.data);
                const runsCount = groupId ? browser.resultIds.filter(resultId => groups[groupId].resultIds.includes(resultId)).length : browser.resultIds.length;

                return createWeight([1, runsCount], {runsCount});
            } else if (currentSortExpression.type === SortType.ByDuration) {
                const browser = browsers[treeNode.data.entityId];
                const groupId = getGroupId(treeNode.data);
                const resultIds = groupId ? browser.resultIds.filter(resultId => groups[groupId].resultIds.includes(resultId)) : browser.resultIds;
                const totalTime = resultIds.reduce((accTime, resultId) => accTime + (results[resultId].duration ?? 0), 0);

                return createWeight([totalTime, treeNode.data.title.join(' ')], {runsCount: resultIds.length, duration: totalTime});
            } else if (currentSortExpression.type === SortType.ByStartTime) {
                const browser = browsers[treeNode.data.entityId];
                const startTime = results[browser.resultIds[0]].timestamp;

                return createWeight([startTime], {startTime});
            }
            break;
        }
    }

    return createInvalidWeight(treeNode);
};

const aggregateWeights = ({currentSortExpression}: EntitiesContext, weights: TreeNodeWeight[]): TreeNodeWeight => {
    if (!currentSortExpression || currentSortExpression.type === SortType.ByName) {
        return createInvalidWeight();
    }

    if (
        currentSortExpression.type === SortType.ByFailedRuns ||
        currentSortExpression.type === SortType.ByTestsCount ||
        currentSortExpression.type === SortType.ByDuration
    ) {
        return weights.reduce<TreeNodeWeight>((accWeight, weight) => {
            const newAccWeight = createWeight(accWeight.value.slice(0), accWeight.metadata);
            for (let i = 0; i < weight.value.length; i++) {
                newAccWeight.value[i] = Number(accWeight.value[i] ?? 0) + Number(weight.value[i]);
            }

            if (weight.metadata.testsCount !== undefined) {
                newAccWeight.metadata.testsCount = (newAccWeight.metadata.testsCount ?? 0) + weight.metadata.testsCount;
            }
            if (weight.metadata.runsCount !== undefined) {
                newAccWeight.metadata.runsCount = (newAccWeight.metadata.runsCount ?? 0) + weight.metadata.runsCount;
            }
            if (weight.metadata.failedRunsCount !== undefined) {
                newAccWeight.metadata.failedRunsCount = (newAccWeight.metadata.failedRunsCount ?? 0) + weight.metadata.failedRunsCount;
            }
            if (weight.metadata.duration !== undefined) {
                newAccWeight.metadata.duration = (newAccWeight.metadata.duration ?? 0) + weight.metadata.duration;
            }

            return newAccWeight;
        }, createWeight(new Array(weights[0]?.value?.length)));
    }

    if (currentSortExpression.type === SortType.ByStartTime) {
        const MAX_DATE = new Date(8640000000000000).getTime();

        return weights.reduce<TreeNodeWeight>((accWeight, weight) => {
            const newAccWeight = createWeight(accWeight.value.slice(0), accWeight.metadata);
            for (let i = 0; i < weight.value.length; i++) {
                newAccWeight.value[i] = Math.min(Number(accWeight.value[i] || MAX_DATE), Number(weight.value[i]));
            }

            if (weight.metadata.startTime !== undefined) {
                newAccWeight.metadata.startTime = Math.min((newAccWeight.metadata.startTime || MAX_DATE), weight.metadata.startTime);
            }

            return newAccWeight;
        }, createWeight(new Array(weights[0]?.value?.length)));
    }

    return createInvalidWeight();
};

const generateTagsForWeight = (weight: TreeNodeWeight): string[] => {
    const tags: string[] = [];

    const testsCount = weight.metadata.testsCount;
    if (testsCount !== undefined) {
        tags.push(`${testsCount} ${(testsCount === 1 ? 'test' : 'tests')}`);
    }

    const runsCount = weight.metadata.runsCount;
    if (runsCount !== undefined) {
        tags.push(`${runsCount} ${(runsCount === 1 ? 'run' : 'runs')}`);
    }

    const failedRunsCount = weight.metadata.failedRunsCount;
    if (failedRunsCount !== undefined) {
        tags.push(`${failedRunsCount} ${(failedRunsCount === 1 ? 'failed run' : 'failed runs')}`);
    }

    const duration = weight.metadata.duration;
    if (duration !== undefined) {
        const durationSeconds = Math.round(duration / 1000 * 10) / 10;
        let averageDurationSeconds = 0;
        if (weight.metadata.runsCount && weight.metadata.runsCount > 1) {
            averageDurationSeconds = Math.round(durationSeconds / weight.metadata.runsCount * 10) / 10;
        }

        if (durationSeconds < 0.1) {
            tags.push('<0s in total');
        } else {
            tags.push(`${durationSeconds}s in total${averageDurationSeconds > 0.1 ? `, ${averageDurationSeconds}s on avg.` : ''}`);
        }
    }

    const startTime = weight.metadata.startTime;
    if (startTime !== undefined) {
        tags.push(`Started at ${new Date(startTime).toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        })}`);
    }

    return tags;
};

export const sortTreeNodes = (entitiesContext: EntitiesContext, treeNodes: TreeNode[]): TreeNode[] => {
    const {currentSortDirection} = entitiesContext;

    // Recursive tree sort. At each level of the tree, it does the following:
    // 1. Compute weights of the current branch
    // 2. Sort current level according to weights
    // 3. Return sorted current level and aggregate of all weights at current level
    const sortAndGetWeight = (treeNodes: TreeNode[]): TreeWeightedSortResult => {
        const treeNodesCopy = treeNodes.slice(0);
        const weights: Record<string, TreeNodeWeight> = {};

        treeNodesCopy.forEach((treeNode, index) => {
            if (treeNode.data.entityType === EntityType.Group && treeNode.children?.length) {
                const sortResult = sortAndGetWeight(treeNode.children);

                const weight = extractWeight(entitiesContext, treeNode, sortResult.weight);

                const newTreeNode = Object.assign({}, treeNode, {
                    children: sortResult.sortedTreeNodes
                });
                newTreeNode.data.tags.push(...generateTagsForWeight(weight));

                weights[treeNode.data.id] = weight;
                treeNodesCopy[index] = newTreeNode;
            } else if (treeNode.data.entityType === EntityType.Suite && treeNode.children?.length) {
                const sortResult = sortAndGetWeight(treeNode.children);

                const weight = extractWeight(entitiesContext, treeNode, sortResult.weight);

                const newTreeNode = Object.assign({}, treeNode, {
                    children: sortResult.sortedTreeNodes
                });
                newTreeNode.data.tags.push(...generateTagsForWeight(weight));

                weights[treeNode.data.id] = weight;
                treeNodesCopy[index] = newTreeNode;
            } else if (treeNode.data.entityType === EntityType.Browser) {
                const weight = extractWeight(entitiesContext, treeNode);

                const newTreeNode = Object.assign({}, treeNode);
                newTreeNode.data.tags.push(...generateTagsForWeight(weight));

                weights[treeNode.data.id] = weight;
                treeNodesCopy[index] = newTreeNode;
            }
        });

        const sortedTreeNodes = treeNodesCopy.sort((a, b): number => {
            const direction = currentSortDirection === SortDirection.Desc ? -1 : 1;

            for (let i = 0; i < weights[a.data.id].value.length; i++) {
                const aWeight = weights[a.data.id].value[i];
                const bWeight = weights[b.data.id].value[i];
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
            weight: aggregateWeights(entitiesContext, Object.values(weights))
        };
    };

    return sortAndGetWeight(treeNodes).sortedTreeNodes;
};
