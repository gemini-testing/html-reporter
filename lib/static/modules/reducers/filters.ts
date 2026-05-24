import {State} from '@/static/new-ui/types/store';
import {Page, VISUAL_CHECKS_PAGE_DIFF_MODE_KEY} from '@/constants';
import actionNames from '@/static/modules/action-names';
import {FiltersAction, InitGuiReportAction, InitStaticReportAction} from '@/static/modules/actions';
import {DiffModeId, DiffModes, ViewMode} from '@/constants';
import {BrowserItem} from '@/types';
import * as localStorageWrapper from '@/static/modules/local-storage-wrapper';
import {getViewQuery} from '@/static/modules/custom-queries';
import {expandBrowserVersions} from '@/static/modules/query-params';
import {isEmpty} from 'lodash';
import {applyStateUpdate} from '@/static/modules/utils/state';

interface FilterData {
    viewMode?: ViewMode;
    nameFilter?: string;
    useMatchCaseFilter?: boolean;
    useRegexFilter?: boolean;
    filteredBrowsers?: BrowserItem[];
}

const updateAppState = (state: State, data: FilterData): State => (
    applyStateUpdate(state, {app: data})
);

export default (state: State, action: FiltersAction | InitGuiReportAction | InitStaticReportAction): State => {
    switch (action.type) {
        case actionNames.INIT_GUI_REPORT:
        case actionNames.INIT_STATIC_REPORT: {
            const suitesPageViewMode = localStorageWrapper.getItem('app.viewMode', ViewMode.ALL) as ViewMode;
            const visualChecksPageDiffMode = localStorageWrapper.getItem(VISUAL_CHECKS_PAGE_DIFF_MODE_KEY, DiffModes.TWO_UP_INTERACTIVE.id) as DiffModeId;

            const viewQuery = getViewQuery(window.location.search);

            if (isEmpty(viewQuery.filteredBrowsers)) {
                viewQuery.filteredBrowsers = state.browsers;
            } else {
                viewQuery.filteredBrowsers = expandBrowserVersions(viewQuery.filteredBrowsers as BrowserItem[], state.browsers);
            }

            const newState = applyStateUpdate(
                state,
                {
                    app: {
                        viewMode: suitesPageViewMode,
                        [Page.visualChecksPage]: {
                            diffMode: visualChecksPageDiffMode
                        }
                    }
                }
            );

            newState.app.filteredBrowsers = viewQuery.filteredBrowsers as BrowserItem[];
            newState.app.viewMode = viewQuery.viewMode as ViewMode || suitesPageViewMode;
            newState.app.nameFilter = viewQuery.testNameFilter as string || '';

            return newState;
        }
        case actionNames.CHANGE_VIEW_MODE:
            return updateAppState(
                state,
                {
                    viewMode: action.payload.data
                }
            );

        case actionNames.VIEW_UPDATE_FILTER_BY_NAME:
            return updateAppState(
                state,
                {
                    nameFilter: action.payload.data
                }
            );

        case actionNames.VIEW_SET_FILTER_MATCH_CASE: {
            return updateAppState(
                state,
                {
                    useMatchCaseFilter: action.payload.data
                }
            );
        }

        case actionNames.VIEW_SET_FILTER_USE_REGEX:
            return updateAppState(
                state,
                {
                    useRegexFilter: action.payload.data
                }
            );

        case actionNames.BROWSERS_SELECTED:
            return updateAppState(
                state,
                {
                    filteredBrowsers: action.payload.data
                }
            );

        case actionNames.SET_SEARCH_LOADING:
            return applyStateUpdate(state, {app: {isSearchLoading: action.payload}});

        default:
            return state;
    }
};
