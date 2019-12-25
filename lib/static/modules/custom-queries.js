'use strict';

import {parseQuery} from './query-params';
import {pick} from 'lodash';

export function getViewQuery(queryString) {
    const query = parseQuery(queryString, {browser: 'filteredBrowsers'});

    return pick(query, [
        'filteredBrowsers',
        'testNameFilter',
        'retryIndex',
        'viewMode',
        'expand',
        'groupByError'
    ]);
}
