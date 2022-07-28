import {defaults} from 'lodash';
import viewModes from 'lib/constants/view-modes';
import {SUCCESS} from 'lib/constants/test-statuses';
import {groupedTests} from 'lib/static/modules/default-state';

exports.mkSuite = (opts) => {
    const suite = defaults(opts, {
        id: 'default-suite-id',
        parentId: null,
        name: 'default-name',
        status: SUCCESS,
        suitePath: [opts.id || 'default-suite-id']
    });

    return {[suite.id]: suite};
};

exports.mkBrowser = (opts) => {
    const browser = defaults(opts, {
        id: 'default-bro-id',
        name: 'default-bro',
        parentId: 'default-test-id',
        resultIds: [],
        version: null
    });

    return {[browser.id]: browser};
};

exports.mkResult = (opts) => {
    const result = defaults(opts, {
        id: 'default-result-id',
        parentId: 'default-bro-id',
        metaInfo: {},
        status: SUCCESS,
        imageIds: []
    });

    return {[result.id]: result};
};

exports.mkImage = (opts) => {
    const image = defaults(opts, {
        id: 'default-image-id',
        parentId: 'default-result-id',
        stateName: 'default-state-name',
        status: SUCCESS
    });

    return {[image.id]: image};
};

exports.mkStateTree = (
    {
        suitesById = {},
        suitesAllRootIds = [],
        suitesFailedRootIds = [],
        suitesStateById = {},
        browsersById = {},
        browsersStateById = {},
        resultsById = {},
        imagesById = {},
        imagesStateById = {}
    } = {}
) => {
    return {
        suites: {
            byId: suitesById, stateById: suitesStateById,
            allRootIds: suitesAllRootIds, failedRootIds: suitesFailedRootIds, allIds: Object.keys(suitesById)
        },
        browsers: {byId: browsersById, stateById: browsersStateById, allIds: Object.keys(browsersById)},
        results: {byId: resultsById, allIds: Object.keys(resultsById)},
        images: {byId: imagesById, stateById: imagesStateById, allIds: Object.keys(imagesById)}
    };
};

exports.mkStateView = (opts = {}) => {
    return defaults(opts, {
        viewMode: viewModes.ALL,
        testNameFilter: '',
        strictMatchFilter: false,
        filteredBrowsers: [],
        groupTestsByKey: ''
    });
};

exports.mkStateGroupedTests = (opts = {}) => {
    return defaults(opts, groupedTests);
};
