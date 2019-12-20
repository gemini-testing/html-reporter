'use strict';

import {parseQuery} from './query-params';
import {pick, has} from 'lodash';

const allowedViewModes = new Set(['all', 'failed']);

export function getViewQuery(queryString) {
    const query = parseQuery(queryString, {browser: 'filteredBrowsers'});

    if (typeof query.filteredBrowsers === 'string') {
        query.filteredBrowsers = [query.filteredBrowsers];
    }

    if (has(query, 'viewMode') && !allowedViewModes.has(query.viewMode)) {
        query.viewMode = 'all';
    }

    return pick(query, [
        'filteredBrowsers',
        'testNameFilter',
        'strictMatchFilter',
        'retryIndex',
        'viewMode',
        'expand',
        'groupByError'
    ]);
}
