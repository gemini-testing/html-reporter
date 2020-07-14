'use strict';

import qs from 'qs';
import {assign, isEmpty, compact} from 'lodash';

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
            }

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
        }}
    );
}

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

export function encodeBrowsers(browsers) {
    return browsers.map(({id, versions}) => {
        const encodedId = encodeURIComponent(id);

        if (isEmpty(versions)) {
            return encodedId;
        }

        const encodedVersions = versions
            .map(encodeURIComponent)
            .join(',');

        return `${encodedId}:${encodedVersions}`;
    });
}

export function decodeBrowsers(browsers) {
    const decode = (browser) => {
        const [browserName, packedVersions = ''] = browser.split(':');
        const versions = packedVersions
            .split(',')
            .map(decodeURIComponent);

        return {
            id: decodeURIComponent(browserName),
            versions: compact(versions)
        };
    };

    return []
        .concat(browsers)
        .filter(Boolean)
        .map(decode);
}

export function setFilteredBrowsers(browsers) {
    const urlExtendedWithBrowsers = appendQuery(
        window.location.href,
        {browser: encodeBrowsers(browsers)}
    );

    window.history.pushState(null, null, urlExtendedWithBrowsers);
}
