import {State} from '@/static/new-ui/types/store';
import actionNames from '@/static/modules/action-names';
import {applyStateUpdate} from '@/static/modules/utils/state';
import {SomeAction} from '@/static/modules/actions/types';
import {getTreeViewItems} from '@/static/new-ui/features/suites/components/SuitesTreeView/selectors';
import {findTreeNodeByBrowserId, findTreeNodeById, getGroupId} from '@/static/new-ui/features/suites/utils';

export default (state: State, action: SomeAction): State => {
    switch (action.type) {
        case actionNames.INIT_STATIC_REPORT:
        case actionNames.INIT_GUI_REPORT:
        case actionNames.GROUP_TESTS_SET_CURRENT_EXPRESSION: {
            const {allTreeNodeIds} = getTreeViewItems(state);

            const expandedTreeNodesById: Record<string, boolean> = {};

            for (const nodeId of allTreeNodeIds) {
                expandedTreeNodesById[nodeId] = true;
            }

            let currentGroupId: string | null | undefined = null;
            let currentTreeNodeId: string | null | undefined;
            if (action.type === actionNames.GROUP_TESTS_SET_CURRENT_EXPRESSION) {
                const {currentBrowserId} = state.app.suitesPage;
                if (currentBrowserId) {
                    const {tree} = getTreeViewItems(state);
                    const browserTreeViewData = findTreeNodeByBrowserId(tree, currentBrowserId);
                    currentTreeNodeId = browserTreeViewData?.id;
                    if (browserTreeViewData) {
                        currentGroupId = getGroupId(browserTreeViewData);
                    }
                }
            }

            return applyStateUpdate(state, {
                app: {
                    suitesPage: {
                        currentGroupId,
                        currentTreeNodeId
                    }
                },
                ui: {
                    suitesPage: {
                        expandedTreeNodesById
                    }
                }
            });
        }
        case actionNames.SUITES_PAGE_SET_CURRENT_SUITE: {
            const diff: Partial<State['app']['suitesPage']> = {};

            if (action.payload.treeNodeId) {
                diff.currentTreeNodeId = action.payload.treeNodeId;
            }
            if (action.payload.browserId) {
                diff.currentBrowserId = action.payload.browserId;
            }
            if (action.payload.groupId) {
                diff.currentGroupId = action.payload.groupId;
            }

            return applyStateUpdate(state, {
                app: {
                    suitesPage: diff
                }
            }) as State;
        }
        case actionNames.SUITES_PAGE_SET_TREE_NODE_EXPANDED: {
            return applyStateUpdate(state, {
                ui: {
                    suitesPage: {
                        expandedTreeNodesById: {
                            [action.payload.nodeId]: action.payload.isExpanded
                        }
                    }
                }
            }) as State;
        }
        case actionNames.SUITES_PAGE_SET_ALL_TREE_NODES: {
            const newExpandedTreeNodesById: Record<string, boolean> = {};

            for (const id in state.ui.suitesPage.expandedTreeNodesById) {
                newExpandedTreeNodesById[id] = action.payload.isExpanded;
            }

            return applyStateUpdate(state, {
                ui: {
                    suitesPage: {
                        expandedTreeNodesById: newExpandedTreeNodesById
                    }
                }
            }) as State;
        }
        case actionNames.SUITES_PAGE_SET_SECTION_EXPANDED: {
            return applyStateUpdate(state, {
                ui: {
                    suitesPage: {
                        expandedSectionsById: {
                            [action.payload.sectionId]: action.payload.isExpanded
                        }
                    }
                }
            }) as State;
        }
        case actionNames.SUITES_PAGE_SET_STEPS_EXPANDED: {
            if (!action.payload.resultId) {
                return state;
            }

            return applyStateUpdate(state, {
                ui: {
                    suitesPage: {
                        expandedStepsByResultId: {
                            [action.payload.resultId]: action.payload.expandedById
                        }
                    }
                }
            }) as State;
        }
        case actionNames.SUITES_PAGE_REVEAL_TREE_NODE: {
            const {tree} = getTreeViewItems(state);
            let nodeData = findTreeNodeById(tree, action.payload.nodeId);
            const newExpandedTreeNodesById: Record<string, boolean> = {};

            while (nodeData) {
                newExpandedTreeNodesById[nodeData.id] = true;
                nodeData = nodeData.parentData ?? null;
            }

            return applyStateUpdate(state, {
                ui: {
                    suitesPage: {
                        expandedTreeNodesById: newExpandedTreeNodesById
                    }
                }
            }) as State;
        }
        default:
            return state;
    }
};
