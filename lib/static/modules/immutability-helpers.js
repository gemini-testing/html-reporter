'use strict';

import update, {extend} from 'immutability-helper';
import {isEmpty, findIndex} from 'lodash';

export const addHelpers = () => {
    extend('$updateSuite', (data, suite) => {
        const {suitePath, browserId, value} = data;

        if (!isEmpty(suitePath)) {
            const name = suitePath.shift();
            const suiteIndex = findIndex(suite.children, {name});

            return update(suite, {children: {[suiteIndex]: {$updateSuite: data}}});
        }

        if (!browserId) {
            return update(suite, {$merge: value});
        }

        const broIndex = findIndex(suite.browsers, {name: browserId});

        return update(suite, {browsers: {[broIndex]: {$merge: value}}});
    });

    extend('$updateState', (data, suite) => {
        const {suitePath, browserId, stateName, retryIndex, value} = data;

        if (!isEmpty(suite.children)) {
            const name = suitePath.shift();
            const suiteIndex = findIndex(suite.children, {name});

            return update(suite, {children: {[suiteIndex]: {$updateState: data}}});
        }

        const broIndex = findIndex(suite.browsers, {name: browserId});
        const bro = suite.browsers[broIndex];
        const retriesLen = bro.retries.length;

        if (!retriesLen || retryIndex >= retriesLen) {
            const imagesInfoIndex = stateName
                ? findIndex(bro.result.imagesInfo, {stateName})
                : bro.result.imagesInfo.length - 1;

            return update(suite, {
                browsers: {
                    [broIndex]: {
                        result: {
                            imagesInfo: {[imagesInfoIndex]: {$merge: value}}
                        }
                    }
                }
            });
        }

        const imagesInfoIndex = stateName
            ? findIndex(bro.retries[retryIndex].imagesInfo, {stateName})
            : bro.retries[retryIndex].imagesInfo.length - 1;

        return update(suite, {
            browsers: {
                [broIndex]: {
                    retries: {
                        [retryIndex]: {
                            imagesInfo: {[imagesInfoIndex]: {$merge: value}}
                        }
                    }
                }
            }
        });
    });
};
