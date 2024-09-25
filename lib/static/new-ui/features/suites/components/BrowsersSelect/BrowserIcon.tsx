import {isString} from 'lodash';
import React, {ReactNode} from 'react';

import styles from './BrowserIcon.module.css';

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
} as const;

export function BrowserIcon({name: browser}: {name: string}): ReactNode {
    const getIcon = (iconName: string): ReactNode => <i className={`fa fa-${iconName} ${styles.icon}`} aria-hidden="true" />;

    if (!isString(browser)) {
        return getIcon('browser');
    }

    const lowerValue = browser.toLowerCase();

    for (const pattern in valueToIcon) {
        if (lowerValue.includes(pattern)) {
            return getIcon(valueToIcon[pattern as keyof typeof valueToIcon]);
        }
    }

    return getIcon('browser');
}
