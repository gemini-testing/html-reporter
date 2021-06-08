import {defaults} from 'lodash';
import viewModes from 'lib/constants/view-modes';
import {SUCCESS} from 'lib/constants/test-statuses';

exports.mkSuite = (opts) => {
    const suite = defaults(opts, {
        id: 'default-suite-id',
        parentId: null,
        name: 'default-name',
        status: SUCCESS
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
        browsersById = {},
        resultsById = {},
        imagesById = {}
    } = {}
) => {
    return {
        suites: {byId: suitesById, allRootIds: suitesAllRootIds, failedRootIds: suitesFailedRootIds},
        browsers: {byId: browsersById, allIds: Object.keys(browsersById)},
        results: {byId: resultsById},
        images: {byId: imagesById, allIds: Object.keys(imagesById)}
    };
};

exports.mkStateView = (opts = {}) => {
    return defaults(opts, {
        viewMode: viewModes.ALL,
        testNameFilter: '',
        strictMatchFilter: false,
        filteredBrowsers: []
    });
};
