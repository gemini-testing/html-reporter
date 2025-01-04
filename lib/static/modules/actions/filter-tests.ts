import actionNames from '@/static/modules/action-names';
import type {Action} from '@/static/modules/actions/types';
import {setFilteredBrowsers} from '@/static/modules/query-params';
import {BrowserItem} from '@/types';
import {ViewMode} from '@/constants';

export type UpdateTestNameFilterAction = Action<typeof actionNames.VIEW_UPDATE_FILTER_BY_NAME, string>;
export const updateTestNameFilter = (testNameFilter: UpdateTestNameFilterAction['payload']): UpdateTestNameFilterAction => {
    return {type: actionNames.VIEW_UPDATE_FILTER_BY_NAME, payload: testNameFilter};
};

export type SetStrictMatchFilterAction = Action<typeof actionNames.VIEW_SET_STRICT_MATCH_FILTER, boolean>;
export const setStrictMatchFilter = (strictMatchFilter: SetStrictMatchFilterAction['payload']): SetStrictMatchFilterAction => {
    return {type: actionNames.VIEW_SET_STRICT_MATCH_FILTER, payload: strictMatchFilter};
};

export type SelectBrowsersAction = Action<typeof actionNames.BROWSERS_SELECTED, {
    browsers: BrowserItem[];
}>;
export const selectBrowsers = (browsers: BrowserItem[]): SelectBrowsersAction => {
    setFilteredBrowsers(browsers);

    return {
        type: actionNames.BROWSERS_SELECTED,
        payload: {browsers}
    };
};

export type ChangeViewModeAction = Action<typeof actionNames.CHANGE_VIEW_MODE, ViewMode>;
export const changeViewMode = (payload: ChangeViewModeAction['payload']): ChangeViewModeAction => ({type: actionNames.CHANGE_VIEW_MODE, payload});

export type FilterTestsAction =
    | UpdateTestNameFilterAction
    | SetStrictMatchFilterAction
    | SelectBrowsersAction
    | ChangeViewModeAction;
