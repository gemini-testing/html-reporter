import actionNames from '@/static/modules/action-names';
import type {Action} from '@/static/modules/actions/types';
import {setFilteredBrowsers} from '@/static/modules/query-params';
import {BrowserItem} from '@/types';
import {ViewMode} from '@/constants';
import {Page} from '@/static/new-ui/types/store';

interface FilterPayload<T>{
    page: Page;
    data: T;
}

export type UpdateNameFilterAction = Action<typeof actionNames.VIEW_UPDATE_FILTER_BY_NAME, FilterPayload<string>>;
export const updateNameFilter = (payload: UpdateNameFilterAction['payload']): UpdateNameFilterAction => {
    return {type: actionNames.VIEW_UPDATE_FILTER_BY_NAME, payload};
};

export type SetMatchCaseFilterAction = Action<typeof actionNames.VIEW_SET_FILTER_MATCH_CASE, FilterPayload<boolean>>;
export const setMatchCaseFilter = (payload: SetMatchCaseFilterAction['payload']): SetMatchCaseFilterAction => {
    return {type: actionNames.VIEW_SET_FILTER_MATCH_CASE, payload};
};

export type SetUseRegexFilterAction = Action<typeof actionNames.VIEW_SET_FILTER_USE_REGEX, FilterPayload<boolean>>;
export const setUseRegexFilter = (payload: SetUseRegexFilterAction['payload']): SetUseRegexFilterAction => {
    return {type: actionNames.VIEW_SET_FILTER_USE_REGEX, payload};
};

export type SelectBrowsersAction = Action<typeof actionNames.BROWSERS_SELECTED, FilterPayload<BrowserItem[]>>;
export const selectBrowsers = (payload: SelectBrowsersAction['payload']): SelectBrowsersAction => {
    setFilteredBrowsers(payload.data);

    return {type: actionNames.BROWSERS_SELECTED, payload};
};

export type ChangeViewModeAction = Action<typeof actionNames.CHANGE_VIEW_MODE, FilterPayload<ViewMode>>;
export const changeViewMode = (payload: ChangeViewModeAction['payload']): ChangeViewModeAction => ({type: actionNames.CHANGE_VIEW_MODE, payload});

export type FiltersAction =
    | UpdateNameFilterAction
    | SetMatchCaseFilterAction
    | SetUseRegexFilterAction
    | SelectBrowsersAction
    | ChangeViewModeAction;
