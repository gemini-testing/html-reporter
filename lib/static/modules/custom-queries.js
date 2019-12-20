import {parseQuery} from './query-params';

export function getViewQuery(url) {
    return parseQuery(url, {
        filteredBrowsers: {type: 'array', param: 'browser'},
        testNameFilter: {type: 'string'},
        retryIndex: {type: 'number'},
        viewMode: {type: 'string'},
        expand: {type: 'string'},
        groupByError: {type: 'boolean'}
    });
}
