import {Page, State} from '@/static/new-ui/types/store';
import actionNames from '@/static/modules/action-names';
import {applyStateUpdate} from '@/static/modules/utils/state';
import {SomeAction} from '@/static/modules/actions/types';
import {getSuitesTreeViewData} from '@/static/new-ui/features/suites/components/SuitesPage/selectors';
import {findTreeNodeByBrowserId, findTreeNodeById, getGroupId} from '@/static/new-ui/features/suites/utils';
import * as localStorageWrapper from '../local-storage-wrapper';
import {MIN_SECTION_SIZE_PERCENT} from '@/static/new-ui/features/suites/constants';
import {TIME_TRAVEL_PLAYER_VISIBILITY_KEY} from '@/constants/local-storage';

const SECTION_SIZES_LOCAL_STORAGE_KEY = 'suites-page-section-sizes';

const getLocalStorageKeyPage = (page: Page): string => (
    `${SECTION_SIZES_LOCAL_STORAGE_KEY}-${page}`
);

export default (state: State, action: SomeAction): State => {
    switch (action.type) {
        case actionNames.INIT_STATIC_REPORT:
        case actionNames.INIT_GUI_REPORT:
        case actionNames.SUITES_PAGE_SET_TREE_VIEW_MODE:
        case actionNames.CHANGE_VIEW_MODE as any: // eslint-disable-line @typescript-eslint/no-explicit-any
        case actionNames.GROUP_TESTS_SET_CURRENT_EXPRESSION: {
            const {allTreeNodeIds} = getSuitesTreeViewData(state);

            const expandedTreeNodesById: Record<string, boolean> = Object.assign({}, state.ui.suitesPage.expandedTreeNodesById);

            for (const nodeId of allTreeNodeIds) {
                expandedTreeNodesById[nodeId] = true;
            }

            let currentGroupId: string | null | undefined = null;
            let currentTreeNodeId: string | null | undefined = state.app[Page.suitesPage].currentTreeNodeId;
            let treeViewMode = state.ui.suitesPage.treeViewMode;
            if (action.type === actionNames.GROUP_TESTS_SET_CURRENT_EXPRESSION || action.type === actionNames.SUITES_PAGE_SET_TREE_VIEW_MODE) {
                const {currentBrowserId} = state.app.suitesPage;
                if (currentBrowserId) {
                    const {tree} = getSuitesTreeViewData(state);
                    const browserTreeViewData = findTreeNodeByBrowserId(tree, currentBrowserId);
                    currentTreeNodeId = browserTreeViewData?.id;
                    if (browserTreeViewData) {
                        currentGroupId = getGroupId(browserTreeViewData);
                    }
                }
            }

            if (action.type === actionNames.SUITES_PAGE_SET_TREE_VIEW_MODE) {
                treeViewMode = action.payload.treeViewMode;
            }

            const suitesSectionSizes = localStorageWrapper.getItem(
                getLocalStorageKeyPage(Page.suitesPage),
                [MIN_SECTION_SIZE_PERCENT, 100 - MIN_SECTION_SIZE_PERCENT]
            ) as number[];

            const visualChecksSectionSizes = localStorageWrapper.getItem(
                getLocalStorageKeyPage(Page.visualChecksPage),
                [MIN_SECTION_SIZE_PERCENT, 100 - MIN_SECTION_SIZE_PERCENT]
            ) as number[];

            const isSnapshotsPlayerVisible = Boolean(localStorageWrapper.getItem(TIME_TRAVEL_PLAYER_VISIBILITY_KEY, true));

            return applyStateUpdate(state, {
                app: {
                    suitesPage: {
                        currentGroupId,
                        currentTreeNodeId
                    }
                },
                ui: {
                    suitesPage: {
                        expandedTreeNodesById,
                        treeViewMode,
                        sectionSizes: suitesSectionSizes,
                        isSnapshotsPlayerVisible
                    },
                    visualChecksPage: {
                        sectionSizes: visualChecksSectionSizes
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
            const {tree} = getSuitesTreeViewData(state);
            let nodeData = findTreeNodeById(tree, action.payload.nodeId);
            const newExpandedTreeNodesById: Record<string, boolean> = {};

            while (nodeData) {
                nodeData = nodeData.parentData ?? null;
                if (nodeData) {
                    newExpandedTreeNodesById[nodeData.id] = true;
                }
            }

            return applyStateUpdate(state, {
                ui: {
                    suitesPage: {
                        expandedTreeNodesById: newExpandedTreeNodesById
                    }
                }
            }) as State;
        }
        case actionNames.SUITES_PAGE_SET_CURRENT_STEP: {
            return applyStateUpdate(state, {
                app: {
                    suitesPage: {
                        currentStepId: action.payload.stepId
                    }
                }
            });
        }
        case actionNames.SUITES_PAGE_SET_CURRENT_HIGHLIGHT_STEP: {
            return applyStateUpdate(state, {
                app: {
                    suitesPage: {
                        currentHighlightedStepId: action.payload.stepId
                    }
                }
            });
        }
        case actionNames.PAGE_SET_SECTION_SIZES: {
            const localStorageSizesKey = getLocalStorageKeyPage(action.payload.page);
            localStorageWrapper.setItem(localStorageSizesKey, action.payload.sizes);

            return applyStateUpdate(state, {
                ui: {
                    [action.payload.page]: {sectionSizes: action.payload.sizes}
                }
            });
        }
        case actionNames.PAGE_SET_BACKUP_SECTION_SIZES: {
            return applyStateUpdate(state, {
                ui: {[action.payload.page]: {backupSectionSizes: action.payload.sizes}}
            });
        }
        default:
            return state;
    }
};
