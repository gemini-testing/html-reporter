import reduceReducers from 'reduce-reducers';
import plugins from '../plugins';
import actionNames from '../action-names';

const defaultPluginsReducers = state => state;
let actualPluginsReducer = defaultPluginsReducers;

export default function(state, action) {
    switch (action.type) {
        case actionNames.INIT_GUI_REPORT:
        case actionNames.INIT_STATIC_REPORT: {
            const pluginReducers = [];

            plugins.forEach(plugin => {
                if (Array.isArray(plugin.reducers)) {
                    pluginReducers.push(reduceReducers(state, ...plugin.reducers));
                }
            });
            actualPluginsReducer = reduceReducers(state, ...pluginReducers);
            break;
        }
    }

    return actualPluginsReducer(state, action);
}
