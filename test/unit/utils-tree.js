'use strict';

import {defaults} from 'lodash';
import {SUCCESS} from '../../lib/constants/test-statuses';

const mkSuite = (opts) => {
    const result = defaults(opts, {
        id: 'default-suite-id',
        parentId: null,
        name: 'default-name',
        root: false
    });

    return {[result.id]: result};
};

const mkBrowser = (opts) => {
    const browser = defaults(opts, {
        id: 'default-bro-id',
        name: 'default-bro',
        parentId: 'default-test-id',
        resultIds: [],
        version: 'default-ver'
    });

    return {[browser.id]: browser};
};

const mkResult = (opts) => {
    const result = defaults(opts, {
        id: 'default-result-id',
        parentId: 'default-bro-id',
        status: SUCCESS
    });

    return {[result.id]: result};
};

const mkStateTree = ({suitesById = {}, browsersById = {}, resultsById = {}, imagesById = {}} = {}) => {
    return {
        suites: {
            byId: suitesById,
            allRootIds: Object.values(suitesById).filter(({root}) => root).map(({id}) => id),
            allIds: Object.keys(suitesById)
        },
        browsers: {
            byId: browsersById,
            allIds: Object.keys(browsersById)
        },
        results: {byId: resultsById},
        images: {byId: imagesById}
    };
};

module.exports = {
    mkSuite,
    mkBrowser,
    mkResult,
    mkStateTree
};
