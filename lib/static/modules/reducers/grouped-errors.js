import {groupErrors} from '../group-errors';
import {getViewQuery} from '../custom-queries';
import actionNames from '../action-names';

export default (state, action) => {
    if (!state.view.groupByError) {
        return state;
    }

    switch (action.type) {
        case actionNames.INIT_GUI_REPORT:
        case actionNames.INIT_STATIC_REPORT: {
            const viewQuery = getViewQuery(window.location.search);
            const {tree, config: {errorPatterns}, view: {viewMode}} = state;
            const groupedErrors = groupErrors({tree, viewMode, errorPatterns, ...viewQuery});

            return {...state, groupedErrors};
        }

        case actionNames.TESTS_END:
        case actionNames.BROWSERS_SELECTED:
        case actionNames.ACCEPT_SCREENSHOT:
        case actionNames.ACCEPT_OPENED_SCREENSHOTS:
        case actionNames.VIEW_UPDATE_FILTER_BY_NAME:
        case actionNames.VIEW_SET_STRICT_MATCH_FILTER:
        case actionNames.VIEW_TOGGLE_GROUP_BY_ERROR:
        case actionNames.VIEW_SHOW_ALL:
        case actionNames.VIEW_SHOW_FAILED: {
            const {
                tree,
                config: {errorPatterns},
                view: {viewMode, filteredBrowsers, testNameFilter, strictMatchFilter}
            } = state;

            const groupedErrors = groupErrors({tree, viewMode, errorPatterns, filteredBrowsers, testNameFilter, strictMatchFilter});

            return {...state, groupedErrors};
        }

        default:
            return state;
    }
};
