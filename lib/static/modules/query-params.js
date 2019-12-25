'use strict';

import qs from 'qs';
import {assign} from 'lodash';

export function parseQuery(queryString, rename = {}) {
    if (!queryString || typeof queryString !== 'string') {
        return {};
    }

    if (queryString[0] === '?') {
        queryString = queryString.slice(1);
    }

    return qs.parse(queryString, {
        decoder: (str, defaultDecoder, charset, type) => {
            if (type === 'key') {
                const key = defaultDecoder(str, null, charset);
                return rename[key] ? rename[key] : key;
            } else if (type === 'value') {
                const value = defaultDecoder(str, null, charset);

                if (value === 'true') {
                    return true;
                }

                if (value === 'false') {
                    return false;
                }

                if (value && !isNaN(value)) {
                    return Number(value);
                }

                return value;
            }
        }}
    );
}

// do not overwrite existing search query, only needed parts
// https://github.com/gemini-testing/html-reporter/pull/294/files#diff-34759a52f8c6795db3e8d8d6b04ae791R28
export function appendQuery(url, query) {
    const resultUrl = new URL(url);

    const urlQuery = resultUrl.search || '';

    const resultQuery = assign(
        qs.parse(urlQuery.slice(1)),
        query
    );

    resultUrl.search = qs.stringify(resultQuery, {arrayFormat: 'repeat'});

    return resultUrl.href;
}
