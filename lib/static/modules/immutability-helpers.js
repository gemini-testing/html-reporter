'use strict';

import update, {extend} from 'immutability-helper';
import {isEmpty, isNumber, findIndex} from 'lodash';

export const addHelpers = () => {
    extend('$updateImagesInfo', (data, bro) => {
        const {value} = data;
        const {retryIndex} = bro;
        const retriesLen = bro.retries.length;
        const broResult = !isNumber(retryIndex) || retryIndex >= retriesLen ? bro.result : bro.retries[retryIndex];

        const updateImagesInfo = broResult.imagesInfo.reduce((acc, imageInfo, i) => {
            return {...acc, [i]: {$merge: value}};
        }, {});

        if (!isNumber(retryIndex) || retryIndex >= retriesLen) {
            return update(bro, {result: {imagesInfo: updateImagesInfo}});
        }

        return update(bro, {
            retries: {
                [retryIndex]: {
                    imagesInfo: updateImagesInfo
                }
            }
        });
    });

    extend('$updateNodes', (data, suite) => {
        const {value} = data;

        if (suite.children) {
            const updateChildren = suite.children.reduce((acc, c, i) => {
                return {...acc, [i]: {$merge: value, $updateNodes: data}};
            }, {});

            return update(suite, {children: updateChildren});
        }

        const updateBrowsers = suite.browsers.reduce((acc, b, i) => {
            return {...acc, [i]: {$merge: value, $updateImagesInfo: data}};
        }, {});

        return update(suite, {browsers: updateBrowsers});
    });

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
