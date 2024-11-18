import {createSelector} from 'reselect';
import {last} from 'lodash';
import {
    BrowserEntity,
    GroupEntity,
    isBrowserEntity,
    isResultEntityError,
    SuiteEntity
} from '@/static/new-ui/types/store';
import {
    getAllRootGroupIds,
    getBrowsers,
    getBrowsersState,
    getGroups,
    getImages,
    getResults,
    getSuites
} from '@/static/new-ui/store/selectors';
import {trimArray} from '@/common-utils';
import {isAcceptable} from '@/static/modules/utils';
import {EntityType, TreeRoot, TreeNode} from '@/static/new-ui/features/suites/components/SuitesPage/types';
import {getEntityType} from '@/static/new-ui/features/suites/utils';

interface TreeViewData {
    tree: TreeNode[];
    visibleTreeNodeIds: string[];
    allTreeNodeIds: string[];
}

// Converts the existing store structure to the one that can be consumed by GravityUI
export const getTreeViewItems = createSelector(
    [getGroups, getSuites, getAllRootGroupIds, getBrowsers, getBrowsersState, getResults, getImages],
    (groups, suites, rootGroupIds, browsers, browsersState, results, images): TreeViewData => {
        const formatEntityToTreeNodeData = (entity: SuiteEntity | BrowserEntity, id: string, parentData?: TreeNode['data']): TreeNode['data'] => {
            if (isBrowserEntity(entity)) {
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
                    title: entity.name,
                    status: lastResult.status,
                    images: resultImages,
                    errorTitle,
                    errorStack,
                    parentData
                };
            }

            return {
                id,
                entityType: getEntityType(entity),
                entityId: entity.id,
                title: entity.name,
                status: entity.status,
                parentData
            };
        };

        const buildTreeBottomUp = (entities: (SuiteEntity | BrowserEntity)[], rootData?: TreeNode['data']): TreeRoot => {
            const TREE_ROOT = Symbol();
            const cache: Record<string | symbol, TreeNode | TreeRoot> = {};

            const createTreeRoot = (): TreeRoot => ({
                isRoot: true,
                data: rootData
            });

            const build = (entity: SuiteEntity | BrowserEntity): TreeNode | TreeRoot => {
                let parentNode: TreeNode | TreeRoot;

                const {parentId} = entity;
                if (parentId) {
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

                const nodePartialId = isBrowserEntity(entity) ? entity.name : entity.suitePath[entity.suitePath.length - 1];
                const currentId = parentNode.data ? `${parentNode.data.id}/${nodePartialId}` : nodePartialId;
                if (cache[currentId]) {
                    return cache[currentId];
                }

                const currentNode: TreeNode = {
                    parentNode,
                    data: formatEntityToTreeNodeData(entity, currentId, parentNode.data)
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

        const formatGroup = (groupEntity: GroupEntity): TreeNode => {
            const testsCount = groupEntity.browserIds.length;
            const retriesCount = groupEntity.resultIds.length;

            const groupNodeData: TreeNode['data'] = {
                id: groupEntity.id,
                entityType: EntityType.Group,
                entityId: groupEntity.id,
                prefix: `${groupEntity.key}:`,
                title: groupEntity.label,
                status: null,
                tags: [
                    `${testsCount} ${testsCount > 1 ? ' tests' : 'test'}`,
                    `${retriesCount} ${retriesCount > 1 ? ' retries' : 'retry'}`
                ]
            };
            const browserEntities = groupEntity.browserIds.filter(browserId => browsersState[browserId].shouldBeShown).map(browserId => browsers[browserId]);

            const suitesTreeRoot = buildTreeBottomUp(browserEntities, groupNodeData);

            return {
                data: groupNodeData,
                children: suitesTreeRoot.children
            };
        };

        const allTreeNodeIds: string[] = [];
        const visibleTreeNodeIds: string[] = [];

        const collectVisibleBrowserIds = (node: TreeNode | TreeRoot): void => {
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
                    collectVisibleBrowserIds(childNode);
                }
            }
        };

        if (rootGroupIds.length > 0) {
            const treeNodes = rootGroupIds
                .map(rootId => formatGroup(groups[rootId]))
                .filter(treeNode => treeNode.children?.length);

            treeNodes.forEach(treeNode => collectVisibleBrowserIds(treeNode));

            return {
                tree: treeNodes,
                allTreeNodeIds,
                visibleTreeNodeIds
            };
        }

        const suitesTreeRoot = buildTreeBottomUp(Object.values(browsers).filter(browser => browsersState[browser.id].shouldBeShown));
        collectVisibleBrowserIds(suitesTreeRoot);

        return {
            visibleTreeNodeIds,
            allTreeNodeIds,
            tree: suitesTreeRoot.children ?? []
        };
    });
