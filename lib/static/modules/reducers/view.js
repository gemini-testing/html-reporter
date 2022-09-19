import url from 'url';
import {produce} from 'immer';
import {isEmpty} from 'lodash';
import {getViewQuery} from '../custom-queries';
import * as localStorageWrapper from '../local-storage-wrapper';
import actionNames from '../action-names';
import diffModes from '../../../constants/diff-modes';
import {EXPAND_ALL, COLLAPSE_ALL, EXPAND_ERRORS, EXPAND_RETRIES} from '../../../constants/expand-modes';

export default produce((state, action) => {
    switch (action.type) {
        case actionNames.INIT_GUI_REPORT:
        case actionNames.INIT_STATIC_REPORT: {
            const {baseHost, defaultView: viewMode, diffMode} = state.config;
            const viewQuery = getViewQuery(window.location.search);
            const lsView = localStorageWrapper.getItem('view', {});

            if (isEmpty(viewQuery.filteredBrowsers)) {
                viewQuery.filteredBrowsers = state.browsers;
            }

            state.view = {...state.view, viewMode, diffMode, baseHost, ...lsView, ...viewQuery};

            break;
        }

        case actionNames.VIEW_EXPAND_ALL: {
            state.view.expand = EXPAND_ALL;
            break;
        }

        case actionNames.VIEW_EXPAND_ERRORS: {
            state.view.expand = EXPAND_ERRORS;
            break;
        }

        case actionNames.VIEW_EXPAND_RETRIES: {
            state.view.expand = EXPAND_RETRIES;
            break;
        }

        case actionNames.VIEW_COLLAPSE_ALL: {
            state.view.expand = COLLAPSE_ALL;
            break;
        }

        case actionNames.CHANGE_VIEW_MODE: {
            state.view.viewMode = action.payload;
            break;
        }

        case actionNames.VIEW_UPDATE_BASE_HOST: {
            const baseHost = action.host;
            const parsedHost = parseHost(baseHost);

            state.view.baseHost = baseHost;
            state.view.parsedHost = parsedHost;

            break;
        }

        case actionNames.VIEW_UPDATE_FILTER_BY_NAME: {
            state.view.testNameFilter = action.testNameFilter;
            break;
        }

        case actionNames.VIEW_SET_STRICT_MATCH_FILTER: {
            state.view.strictMatchFilter = action.strictMatchFilter;
            break;
        }

        case actionNames.GROUP_TESTS_BY_KEY: {
            state.view.keyToGroupTestsBy = action.payload;
            break;
        }

        case actionNames.BROWSERS_SELECTED: {
            state.view.filteredBrowsers = action.payload.browsers;
            break;
        }

        case actionNames.VIEW_THREE_UP_DIFF:
            state.view.diffMode = diffModes.THREE_UP.id;
            break;

        case actionNames.VIEW_THREE_UP_SCALED_DIFF:
            state.view.diffMode = diffModes.THREE_UP_SCALED.id;
            break;

        case actionNames.VIEW_ONLY_DIFF:
            state.view.diffMode = diffModes.ONLY_DIFF.id;
            break;

        case actionNames.VIEW_SWITCH_DIFF:
            state.view.diffMode = diffModes.SWITCH.id;
            break;

        case actionNames.VIEW_SWIPE_DIFF:
            state.view.diffMode = diffModes.SWIPE.id;
            break;

        case actionNames.VIEW_ONION_SKIN_DIFF:
            state.view.diffMode = diffModes.ONION_SKIN.id;
            break;
    }
});

function parseHost(baseHost) {
    const parsedHost = url.parse(baseHost, false, true);

    return {
        host: parsedHost.slashes ? parsedHost.host : baseHost,
        protocol: parsedHost.slashes ? parsedHost.protocol : null,
        hostname: null,
        port: null
    };
}
