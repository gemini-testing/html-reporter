'use strict';

import {parseQuery, decodeBrowsers} from './query-params';
import {pick, has} from 'lodash';
import {ViewMode} from '../../constants/view-modes';
import {configDefaults} from '../../constants/defaults';

const allowedViewModes = new Set(Object.values(ViewMode));

export function getViewQuery(queryString) {
    const query = parseQuery(queryString, {browser: 'filteredBrowsers'});

    query.filteredBrowsers = decodeBrowsers(query.filteredBrowsers);

    if (has(query, 'viewMode') && !allowedViewModes.has(query.viewMode)) {
        query.viewMode = configDefaults.defaultView;
    }

    return pick(query, [
        'filteredBrowsers',
        'testNameFilter',
        'strictMatchFilter',
        'retryIndex',
        'viewMode',
        'expand'
    ]);
}
