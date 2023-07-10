import React from 'react';
import {isString} from 'lodash';

const valueToIcon = {
    google: 'chrome',
    chrome: 'chrome',
    firefox: 'firefox',
    safari: 'safari',
    edge: 'edge',
    yandex: 'yandex',
    yabro: 'yandex',
    ie: 'internet-explorer',
    explorer: 'internet-explorer',
    opera: 'opera',
    phone: 'mobile',
    mobile: 'mobile',
    tablet: 'tablet',
    ipad: 'tablet'
};

export function mkBrowserIcon(browser) {
    const mkIcon = (iconName) => <i className={`fa fa-${iconName}`} aria-hidden="true" />;

    if (!isString(browser)) {
        return mkIcon('browser');
    }

    const lowerValue = browser.toLowerCase();

    for (const pattern in valueToIcon) {
        if (lowerValue.includes(pattern)) {
            return mkIcon(valueToIcon[pattern]);
        }
    }

    return mkIcon('browser');
}

export function buildComplexId(browserId, version) {
    return version
        ? `${browserId} (${version})`
        : browserId;
}
