import url from 'url';
import {produce} from 'immer';
import {isEmpty} from 'lodash';
import {getViewQuery} from '../custom-queries';
import * as localStorageWrapper from '../local-storage-wrapper';
import actionNames from '../action-names';
import viewModes from '../../../constants/view-modes';
import {EXPAND_ALL, COLLAPSE_ALL, EXPAND_ERRORS, EXPAND_RETRIES} from '../../../constants/expand-modes';

export default produce((state, action) => {
    switch (action.type) {
        case actionNames.INIT_GUI_REPORT:
        case actionNames.INIT_STATIC_REPORT: {
            const {scaleImages, lazyLoadOffset, baseHost, defaultView: viewMode} = state.config;
            const viewQuery = getViewQuery(window.location.search);
            const lsView = localStorageWrapper.getItem('view', {});

            if (isEmpty(viewQuery.filteredBrowsers)) {
                viewQuery.filteredBrowsers = state.browsers;
            }

            state.view = {...state.view, scaleImages, lazyLoadOffset, viewMode, baseHost, ...lsView, ...viewQuery};

            break;
        }

        case actionNames.RUN_ALL_TESTS:
        case actionNames.RUN_FAILED_TESTS:
        case actionNames.RETRY_SUITE:
        case actionNames.RETRY_TEST: {
            state.view.groupByError = false;
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

        case actionNames.VIEW_SHOW_ALL: {
            state.view.viewMode = viewModes.ALL;
            break;
        }

        case actionNames.VIEW_SHOW_FAILED: {
            state.view.viewMode = viewModes.FAILED;
            break;
        }

        case actionNames.VIEW_TOGGLE_SKIPPED: {
            state.view.showSkipped = !state.view.showSkipped;
            break;
        }

        case actionNames.VIEW_TOGGLE_ONLY_DIFF: {
            state.view.showOnlyDiff = !state.view.showOnlyDiff;
            break;
        }

        case actionNames.VIEW_TOGGLE_SCALE_IMAGES: {
            state.view.scaleImages = !state.view.scaleImages;
            break;
        }

        case actionNames.VIEW_TOGGLE_LAZY_LOAD_IMAGES: {
            state.view.lazyLoadOffset = state.view.lazyLoadOffset ? 0 : state.config.lazyLoadOffset;
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

        case actionNames.VIEW_TOGGLE_GROUP_BY_ERROR: {
            state.view.groupByError = !state.view.groupByError;
            break;
        }

        case actionNames.BROWSERS_SELECTED: {
            state.view.filteredBrowsers = action.payload.browsers;
            break;
        }
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
