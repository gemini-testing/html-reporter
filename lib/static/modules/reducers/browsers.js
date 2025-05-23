import _ from 'lodash';
import actionNames from '../action-names';
import {BrowserVersions} from '../../../constants/browser';

export default (state, action) => {
    switch (action.type) {
        case actionNames.INIT_GUI_REPORT: {
            const {tree} = action.payload;
            const browsers = extractBrowsers(tree.results);

            return {...state, browsers, browserFeatures: action.payload.browserFeatures ?? {}};
        }

        case actionNames.INIT_STATIC_REPORT: {
            const {browsers} = action.payload;

            return {...state, browsers};
        }

        case actionNames.SET_BROWSER_FEATURES: {
            return {...state, browserFeatures: action.payload.browserFeatures};
        }

        default:
            return state;
    }
};

function extractBrowsers(results) {
    const getVersion = (result) => ({
        id: result.name,
        versions: _.get(result, 'metaInfo.browserVersion', BrowserVersions.UNKNOWN)
    });
    const getUniqVersions = (set) => _(set)
        .map('versions')
        .compact()
        .uniq()
        .value();

    return _(results.allIds)
        .map((resultId) => getVersion(results.byId[resultId]))
        .flattenDeep()
        .groupBy('id')
        .mapValues(getUniqVersions)
        .map((versions, id) => ({id, versions}))
        .value();
}
