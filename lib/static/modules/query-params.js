'use strict';

import {forEach, isArray} from 'lodash';

export function parseQuery(queryString, rename = {}) {
    if (!queryString || typeof queryString !== 'string') {
        return {};
    }

    if (queryString[0] === '?') {
        queryString = queryString.slice(1);
    }

    const {searchParams} = new URL(`http://localhost/?${queryString}`);
    const query = {};

    searchParams.forEach((value, key) => {
        if (value === 'true') {
            value = true;
        } else if (value === 'false') {
            value = false;
        } else if (value && !isNaN(value)) {
            value = Number(value);
        }

        const k = rename[key] || key;

        if (query.hasOwnProperty(k)) {
            if (!Array.isArray(query[k])) {
                query[k] = [query[k]];
            }
            query[k].push(value);
        } else {
            query[k] = value;
        }
    });

    return query;
}

export function appendQuery(url, query) {
    const resultUrl = new URL(url);

    forEach(query, (v, k) => {
        if (isArray(v)) {
            resultUrl.searchParams.delete(k);
            forEach(v, (param) => {
                resultUrl.searchParams.append(k, param);
            });
        } else {
            resultUrl.searchParams.set(k, v);
        }
    });

    return resultUrl.href;
}
