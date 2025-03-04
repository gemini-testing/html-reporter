import {isEmpty} from 'lodash';
import {getViewQuery} from '../custom-queries';
import * as localStorageWrapper from '../local-storage-wrapper';
import actionNames from '../action-names';
import {EXPAND_ALL, COLLAPSE_ALL, EXPAND_ERRORS, EXPAND_RETRIES} from '../../../constants/expand-modes';

export default (state, action) => {
    switch (action.type) {
        case actionNames.INIT_GUI_REPORT:
        case actionNames.INIT_STATIC_REPORT: {
            const {baseHost, defaultView: viewMode, diffMode} = state.config;
            const viewQuery = getViewQuery(window.location.search);
            const lsView = localStorageWrapper.getItem('view', {});

            if (isEmpty(viewQuery.filteredBrowsers)) {
                viewQuery.filteredBrowsers = state.browsers;
            }

            return {...state, view: {...state.view, viewMode, diffMode, baseHost, ...lsView, ...viewQuery}};
        }

        case actionNames.VIEW_UPDATE_BASE_HOST: {
            const baseHost = action.payload.host;

            return {...state, view: {...state.view, baseHost}};
        }

        case actionNames.VIEW_EXPAND_ALL:
            return {...state, view: {...state.view, expand: EXPAND_ALL}};

        case actionNames.VIEW_EXPAND_ERRORS:
            return {...state, view: {...state.view, expand: EXPAND_ERRORS}};

        case actionNames.VIEW_EXPAND_RETRIES:
            return {...state, view: {...state.view, expand: EXPAND_RETRIES}};

        case actionNames.VIEW_COLLAPSE_ALL:
            return {...state, view: {...state.view, expand: COLLAPSE_ALL}};

        case actionNames.CHANGE_VIEW_MODE:
            return {...state, view: {...state.view, viewMode: action.payload}};

        case actionNames.VIEW_UPDATE_FILTER_BY_NAME:
            return {...state, view: {...state.view, testNameFilter: action.payload}};

        case actionNames.VIEW_SET_FILTER_MATCH_CASE: {
            return {...state, view: {...state.view, useMatchCaseFilter: action.payload}};
        }

        case actionNames.VIEW_SET_FILTER_USE_REGEX:
            return {...state, view: {...state.view, useRegexFilter: action.payload}};

        case actionNames.VIEW_SET_STRICT_MATCH_FILTER:
            return {...state, view: {...state.view, strictMatchFilter: action.payload}};

        case actionNames.GROUP_TESTS_BY_KEY:
            return {...state, view: {...state.view, keyToGroupTestsBy: action.payload}};

        case actionNames.BROWSERS_SELECTED:
            return {...state, view: {...state.view, filteredBrowsers: action.payload.browsers}};

        case actionNames.SET_DIFF_MODE:
            return {...state, view: {...state.view, diffMode: action.payload.diffModeId}};

        default:
            return state;
    }
};
