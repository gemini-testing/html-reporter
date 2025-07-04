import {Pages, State} from '@/static/new-ui/types/store';
import actionNames from '@/static/modules/action-names';
import {FiltersAction, InitGuiReportAction, InitStaticReportAction} from '@/static/modules/actions';
import {ViewMode} from '@/constants';
import {BrowserItem} from '@/types';
import * as localStorageWrapper from '@/static/modules/local-storage-wrapper';
import {getViewQuery} from '@/static/modules/custom-queries';
import {isEmpty} from 'lodash';

interface FilterData {
    viewMode?: ViewMode;
    nameFilter?: string;
    useMatchCaseFilter?: boolean;
    useRegexFilter?: boolean;
    filteredBrowsers?: BrowserItem[];
}

const updateAppState = (state: State, page: Pages, data: FilterData): State => (
    {
        ...state,
        app: {
            ...state.app,
            [page]: {
                ...state.app[page],
                ...data
            }
        }
    }
);

export default (state: State, action: FiltersAction | InitGuiReportAction | InitStaticReportAction): State => {
    switch (action.type) {
        case actionNames.INIT_GUI_REPORT:
        case actionNames.INIT_STATIC_REPORT: {
            const suitesPageViewMode = localStorageWrapper.getItem('app.suitesPage.viewMode', ViewMode.ALL) as ViewMode;
            const visualChecksPageViewMode = localStorageWrapper.getItem('app.visualChecksPage.viewMode', ViewMode.ALL) as ViewMode;

            const viewQuery = getViewQuery(window.location.search);

            if (isEmpty(viewQuery.filteredBrowsers)) {
                viewQuery.filteredBrowsers = state.browsers;
            }

            const newState = {
                ...state,
                app: {
                    ...state.app,
                    [Pages.suitesPage]: {
                        ...state.app[Pages.suitesPage],
                        viewMode: suitesPageViewMode
                    },
                    [Pages.visualChecksPage]: {
                        ...state.app[Pages.visualChecksPage],
                        viewMode: visualChecksPageViewMode
                    }
                }
            };

            if (window.location.hash === 'visual-checks-page') {
                newState.app[Pages.visualChecksPage].filteredBrowsers = viewQuery.filteredBrowsers as BrowserItem[];
            } else {
                newState.app[Pages.suitesPage].filteredBrowsers = viewQuery.filteredBrowsers as BrowserItem[];
            }

            return newState;
        }
        case actionNames.CHANGE_VIEW_MODE:
            return updateAppState(
                state,
                action.payload.page,
                {
                    viewMode: action.payload.data
                }
            );

        case actionNames.VIEW_UPDATE_FILTER_BY_NAME:
            return updateAppState(
                state,
                action.payload.page,
                {
                    nameFilter: action.payload.data
                }
            );

        case actionNames.VIEW_SET_FILTER_MATCH_CASE: {
            return updateAppState(
                state,
                action.payload.page,
                {
                    useMatchCaseFilter: action.payload.data
                }
            );
        }

        case actionNames.VIEW_SET_FILTER_USE_REGEX:
            return updateAppState(
                state,
                action.payload.page,
                {
                    useRegexFilter: action.payload.data
                }
            );

        case actionNames.BROWSERS_SELECTED:
            return updateAppState(
                state,
                action.payload.page,
                {
                    filteredBrowsers: action.payload.data
                }
            );

        default:
            return state;
    }
};
