import {Page, State} from '@/static/new-ui/types/store';
import actionNames from '@/static/modules/action-names';
import {FiltersAction, InitGuiReportAction, InitStaticReportAction} from '@/static/modules/actions';
import {ViewMode} from '@/constants';
import {BrowserItem} from '@/types';
import * as localStorageWrapper from '@/static/modules/local-storage-wrapper';
import {getViewQuery} from '@/static/modules/custom-queries';
import {isEmpty} from 'lodash';
import {applyStateUpdate} from '@/static/modules/utils/state';

interface FilterData {
    viewMode?: ViewMode;
    nameFilter?: string;
    useMatchCaseFilter?: boolean;
    useRegexFilter?: boolean;
    filteredBrowsers?: BrowserItem[];
}

const updateAppState = (state: State, page: Page, data: FilterData): State => (
    applyStateUpdate(state, {app: {[page]: data}})
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

            const newState = applyStateUpdate(
                state,
                {
                    app: {
                        [Page.suitesPage]: {
                            viewMode: suitesPageViewMode
                        },
                        [Page.visualChecksPage]: {
                            viewMode: visualChecksPageViewMode
                        }
                    }
                }
            );

            if (window.location.hash?.startsWith('#/visual-checks')) {
                newState.app[Page.visualChecksPage].filteredBrowsers = viewQuery.filteredBrowsers as BrowserItem[];
                newState.app[Page.visualChecksPage].viewMode = viewQuery.viewMode as ViewMode || visualChecksPageViewMode;
                newState.app[Page.visualChecksPage].nameFilter = viewQuery.testNameFilter as string || '';
            } else { // Need for backward compatibility with old ui where are suites page only
                newState.app[Page.suitesPage].filteredBrowsers = viewQuery.filteredBrowsers as BrowserItem[];
                newState.app[Page.suitesPage].viewMode = viewQuery.viewMode as ViewMode || suitesPageViewMode;
                newState.app[Page.suitesPage].nameFilter = viewQuery.testNameFilter as string || '';
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
