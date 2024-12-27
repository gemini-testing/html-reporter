import actionNames from '@/static/modules/action-names';
import {Action} from '@/static/modules/actions/types';
import {CheckStatus} from '@/constants/checked-statuses';

/** These actions are mostly used in old UI */

export type ToggleStateResultAction = Action<typeof actionNames.TOGGLE_STATE_RESULT, {
    imageId: string;
    shouldBeOpened: boolean;
}>;
export const toggleStateResult = (payload: ToggleStateResultAction['payload']): ToggleStateResultAction => ({type: actionNames.TOGGLE_STATE_RESULT, payload});

export type CloseSectionsAction = Action<typeof actionNames.CLOSE_SECTIONS, string[]>;
export const closeSections = (payload: CloseSectionsAction['payload']): CloseSectionsAction => ({type: actionNames.CLOSE_SECTIONS, payload});

export type SelectAllAction = Action<typeof actionNames.SELECT_ALL>;
export const selectAll = (): SelectAllAction => ({type: actionNames.SELECT_ALL});

export type DeselectAllAction = Action<typeof actionNames.DESELECT_ALL>;
export const deselectAll = (): DeselectAllAction => ({type: actionNames.DESELECT_ALL});

export type ExpandAllAction = Action<typeof actionNames.VIEW_EXPAND_ALL>;
export const expandAll = (): ExpandAllAction => ({type: actionNames.VIEW_EXPAND_ALL});

export type ExpandErrorsAction = Action<typeof actionNames.VIEW_EXPAND_ERRORS>;
export const expandErrors = (): ExpandErrorsAction => ({type: actionNames.VIEW_EXPAND_ERRORS});

export type ExpandRetriesAction = Action<typeof actionNames.VIEW_EXPAND_RETRIES>;
export const expandRetries = (): ExpandRetriesAction => ({type: actionNames.VIEW_EXPAND_RETRIES});

export type CollapseAllAction = Action<typeof actionNames.VIEW_COLLAPSE_ALL>;
export const collapseAll = (): CollapseAllAction => ({type: actionNames.VIEW_COLLAPSE_ALL});

export type ToggleSuiteSectionAction = Action<typeof actionNames.TOGGLE_SUITE_SECTION, {
    suiteId: string;
    shouldBeOpened: boolean;
}>;
export const toggleSuiteSection = (payload: ToggleSuiteSectionAction['payload']): ToggleSuiteSectionAction => ({type: actionNames.TOGGLE_SUITE_SECTION, payload});

export type ToggleBrowserSectionAction = Action<typeof actionNames.TOGGLE_BROWSER_SECTION, {
    browserId: string;
    shouldBeOpened: boolean;
}>;
export const toggleBrowserSection = (payload: ToggleBrowserSectionAction['payload']): ToggleBrowserSectionAction => ({type: actionNames.TOGGLE_BROWSER_SECTION, payload});

export type ToggleBrowserCheckboxAction = Action<typeof actionNames.TOGGLE_BROWSER_CHECKBOX, {
    suiteBrowserId: string;
    checkStatus: CheckStatus;
}>;
export const toggleBrowserCheckbox = (payload: ToggleBrowserCheckboxAction['payload']): ToggleBrowserCheckboxAction => ({type: actionNames.TOGGLE_BROWSER_CHECKBOX, payload});

export type ToggleSuiteCheckboxAction = Action<typeof actionNames.TOGGLE_SUITE_CHECKBOX, {
    suiteId: string;
    checkStatus: CheckStatus;
}>;
export const toggleSuiteCheckbox = (payload: ToggleSuiteCheckboxAction['payload']): ToggleSuiteCheckboxAction => ({type: actionNames.TOGGLE_SUITE_CHECKBOX, payload});

export type ToggleGroupCheckboxAction = Action<typeof actionNames.TOGGLE_GROUP_CHECKBOX, {
    browserIds: string[];
    checkStatus: CheckStatus;
}>;
export const toggleGroupCheckbox = (payload: ToggleGroupCheckboxAction['payload']): ToggleGroupCheckboxAction => ({type: actionNames.TOGGLE_GROUP_CHECKBOX, payload});

export type UpdateBottomProgressBarAction = Action<typeof actionNames.UPDATE_BOTTOM_PROGRESS_BAR, {
    currentRootSuiteId: string;
}>;
export const updateBottomProgressBar = (payload: UpdateBottomProgressBarAction['payload']): UpdateBottomProgressBarAction => ({type: actionNames.UPDATE_BOTTOM_PROGRESS_BAR, payload});

export type ToggleTestsGroupAction = Action<typeof actionNames.TOGGLE_TESTS_GROUP, {
    browserIds: string[];
    resultIds: string[];
    isActive: boolean;
}>;
export const toggleTestsGroup = (payload: ToggleTestsGroupAction['payload']): ToggleTestsGroupAction => ({type: actionNames.TOGGLE_TESTS_GROUP, payload});

export type ChangeTestRetryAction = Action<typeof actionNames.CHANGE_TEST_RETRY, {
    browserId: string;
    retryIndex: number;
    suitesPage?: {
        treeNodeId: string;
    }
}>;
export const changeTestRetry = (result: ChangeTestRetryAction['payload']): ChangeTestRetryAction =>
    ({type: actionNames.CHANGE_TEST_RETRY, payload: result});

export type SuiteTreeStateAction =
    | ToggleStateResultAction
    | CloseSectionsAction
    | ExpandAllAction
    | SelectAllAction
    | DeselectAllAction
    | ExpandErrorsAction
    | ExpandRetriesAction
    | CollapseAllAction
    | ToggleSuiteSectionAction
    | ToggleBrowserSectionAction
    | ToggleBrowserCheckboxAction
    | ToggleSuiteCheckboxAction
    | ToggleGroupCheckboxAction
    | UpdateBottomProgressBarAction
    | ToggleTestsGroupAction
    | ChangeTestRetryAction;
