import actionNames from '@/static/modules/action-names';
import {Action} from '@/static/modules/actions/types';

export type SuitesPageSetCurrentTreeNodeAction = Action<typeof actionNames.SUITES_PAGE_SET_CURRENT_SUITE, Partial<{
    treeNodeId: string;
    browserId: string;
    groupId: string | null;
}>>;
export const setCurrentTreeNode = (payload: SuitesPageSetCurrentTreeNodeAction['payload']): SuitesPageSetCurrentTreeNodeAction => {
    return {type: actionNames.SUITES_PAGE_SET_CURRENT_SUITE, payload};
};

type SetTreeNodeExpandedStateAction = Action<typeof actionNames.SUITES_PAGE_SET_TREE_NODE_EXPANDED, {
    nodeId: string;
    isExpanded: boolean;
}>;
export const setTreeNodeExpandedState = (payload: SetTreeNodeExpandedStateAction['payload']): SetTreeNodeExpandedStateAction =>
    ({type: actionNames.SUITES_PAGE_SET_TREE_NODE_EXPANDED, payload});

type SetAllTreeNodesStateAction = Action<typeof actionNames.SUITES_PAGE_SET_ALL_TREE_NODES, {
    isExpanded: boolean;
}>;
export const setAllTreeNodesState = (payload: SetAllTreeNodesStateAction['payload']): SetAllTreeNodesStateAction =>
    ({type: actionNames.SUITES_PAGE_SET_ALL_TREE_NODES, payload});

type RevealTreeNodeAction = Action<typeof actionNames.SUITES_PAGE_REVEAL_TREE_NODE, {
    nodeId: string;
}>;
export const revealTreeNode = (payload: RevealTreeNodeAction['payload']): RevealTreeNodeAction =>
    ({type: actionNames.SUITES_PAGE_REVEAL_TREE_NODE, payload});

type SetSectionExpandedStateAction = Action<typeof actionNames.SUITES_PAGE_SET_SECTION_EXPANDED, {
    sectionId: string;
    isExpanded: boolean;
}>;
export const setSectionExpandedState = (payload: SetSectionExpandedStateAction['payload']): SetSectionExpandedStateAction =>
    ({type: actionNames.SUITES_PAGE_SET_SECTION_EXPANDED, payload});

type SetStepsExpandedStateAction = Action<typeof actionNames.SUITES_PAGE_SET_STEPS_EXPANDED, {
    resultId: string;
    expandedById: Record<string, boolean>;
}>;
export const setStepsExpandedState = (payload: SetStepsExpandedStateAction['payload']): SetStepsExpandedStateAction =>
    ({type: actionNames.SUITES_PAGE_SET_STEPS_EXPANDED, payload});

export type SuitesPageAction =
    | SetTreeNodeExpandedStateAction
    | SetAllTreeNodesStateAction
    | SuitesPageSetCurrentTreeNodeAction
    | SetSectionExpandedStateAction
    | SetStepsExpandedStateAction
    | RevealTreeNodeAction;
