'use strict';

import {parseQuery} from './query-params';
import {pick, has} from 'lodash';
import viewModes from '../../constants/view-modes';
import {config} from '../../constants/defaults';

const allowedViewModes = new Set(Object.values(viewModes));

export function getViewQuery(queryString) {
    const query = parseQuery(queryString, {browser: 'filteredBrowsers'});

    if (typeof query.filteredBrowsers === 'string') {
        query.filteredBrowsers = [query.filteredBrowsers];
    }

    if (has(query, 'viewMode') && !allowedViewModes.has(query.viewMode)) {
        query.viewMode = config.defaultView;
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
