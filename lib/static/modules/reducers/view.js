import url from 'url';
import {isEmpty} from 'lodash';
import {getViewQuery} from '../custom-queries';
import * as localStorageWrapper from '../local-storage-wrapper';
import actionNames from '../action-names';
import {DiffModes} from '../../../constants/diff-modes';
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
            const baseHost = action.host;
            const parsedHost = parseHost(baseHost);

            return {...state, view: {...state.view, baseHost, parsedHost}};
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
            return {...state, view: {...state.view, testNameFilter: action.testNameFilter}};

        case actionNames.VIEW_SET_STRICT_MATCH_FILTER:
            return {...state, view: {...state.view, strictMatchFilter: action.strictMatchFilter}};

        case actionNames.GROUP_TESTS_BY_KEY:
            return {...state, view: {...state.view, keyToGroupTestsBy: action.payload}};

        case actionNames.BROWSERS_SELECTED:
            return {...state, view: {...state.view, filteredBrowsers: action.payload.browsers}};

        case actionNames.VIEW_THREE_UP_DIFF:
            return {...state, view: {...state.view, diffMode: DiffModes.THREE_UP.id}};

        case actionNames.VIEW_THREE_UP_SCALED_DIFF:
            return {...state, view: {...state.view, diffMode: DiffModes.THREE_UP_SCALED.id}};

        case actionNames.VIEW_THREE_UP_SCALED_TO_FIT_DIFF:
            return {...state, view: {...state.view, diffMode: DiffModes.THREE_UP_SCALED_TO_FIT.id}};

        case actionNames.VIEW_ONLY_DIFF:
            return {...state, view: {...state.view, diffMode: DiffModes.ONLY_DIFF.id}};

        case actionNames.VIEW_SWITCH_DIFF:
            return {...state, view: {...state.view, diffMode: DiffModes.SWITCH.id}};

        case actionNames.VIEW_SWIPE_DIFF:
            return {...state, view: {...state.view, diffMode: DiffModes.SWIPE.id}};

        case actionNames.VIEW_ONION_SKIN_DIFF:
            return {...state, view: {...state.view, diffMode: DiffModes.ONION_SKIN.id}};

        default:
            return state;
    }
};

function parseHost(baseHost) {
    const parsedHost = url.parse(baseHost, false, true);

    return {
        host: parsedHost.slashes ? parsedHost.host : baseHost,
        protocol: parsedHost.slashes ? parsedHost.protocol : null,
        hostname: null,
        port: null
    };
}
