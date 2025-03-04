import {defaults} from 'lodash';
import {ViewMode} from 'lib/constants/view-modes';
import {SUCCESS, TestStatus} from 'lib/constants/test-statuses';
import {CheckStatus} from 'lib/constants/checked-statuses';

export interface TreeSuite {
    id: string
    parentId: string | null,
    name: string
    status: TestStatus,
    suitePath: string[],
}

export const mkSuite = (opts: Partial<TreeSuite>): Record<string, TreeSuite> => {
    const suite = defaults(opts, {
        id: 'default-suite-id',
        parentId: null,
        name: 'default-name',
        status: SUCCESS,
        suitePath: [opts.id || 'default-suite-id']
    });

    return {[suite.id]: suite};
};

export interface TreeBrowser {
    id: string
    name: string
    parentId: string
    resultIds: string[],
    version: string | null
}

export const mkBrowser = (opts: Partial<TreeBrowser>): Record<string, TreeBrowser> => {
    const browser = defaults(opts, {
        id: 'default-bro-id',
        name: 'default-bro',
        parentId: 'default-test-id',
        resultIds: [],
        version: null
    });

    return {[browser.id]: browser};
};

export interface TreeResult {
    id: string,
    parentId: string,
    metaInfo: Record<string, unknown>,
    status: TestStatus,
    imageIds: string[]
}

export const mkResult = (opts: Partial<TreeResult>): Record<string, TreeResult> => {
    const result = defaults(opts, {
        id: 'default-result-id',
        parentId: 'default-bro-id',
        metaInfo: {},
        status: SUCCESS,
        imageIds: []
    });

    return {[result.id]: result};
};

export interface TreeImage {
    id: string
    parentId: string
    stateName: string
    status: TestStatus
}

export const mkImage = (opts: Partial<TreeImage>): Record<string, TreeImage> => {
    const image = defaults(opts, {
        id: 'default-image-id',
        parentId: 'default-result-id',
        stateName: 'default-state-name',
        status: SUCCESS
    });

    return {[image.id]: image};
};

export interface Tree {
    suites: {
        byId: Record<string, TreeSuite>,
        allRootIds: string[],
        failedRootIds: string[],
        allIds: string[],
        stateById: Record<string, {checkStatus: CheckStatus, shouldBeShown: boolean}>
    },
    browsers: {
        byId: Record<string, TreeBrowser>,
        allIds: string[],
        stateById: Record<string, {checkStatus: CheckStatus, shouldBeShown: boolean}>
    },
    results: {
        byId: Record<string, TreeResult>,
        allIds: string[]
        stateById: Record<string, {matchedSelectedGroup: boolean}>
    },
    images: {
        byId: Record<string, TreeImage>,
        allIds: string[],
        stateById: Record<string, {shouldBeOpened: boolean}>
    }
}

export const mkStateTree = (
    {
        suitesById = {},
        suitesAllRootIds = [],
        suitesFailedRootIds = [],
        suitesStateById = {},
        browsersById = {},
        browsersStateById = {},
        resultsById = {},
        resultsStateById = {},
        imagesById = {},
        imagesStateById = {}
    } = {}
): Tree => {
    return {
        suites: {
            byId: suitesById, stateById: suitesStateById,
            allRootIds: suitesAllRootIds, failedRootIds: suitesFailedRootIds, allIds: Object.keys(suitesById)
        },
        browsers: {byId: browsersById, stateById: browsersStateById, allIds: Object.keys(browsersById)},
        results: {byId: resultsById, stateById: resultsStateById, allIds: Object.keys(resultsById)},
        images: {byId: imagesById, stateById: imagesStateById, allIds: Object.keys(imagesById)}
    };
};

export interface View {
    viewMode: ViewMode,
    testNameFilter: string,
    useRegexFilter: boolean,
    useMatchCaseFilter: boolean,
    strictMatchFilter: boolean,
    filteredBrowsers: {id: string, versions: string[]}[],
    keyToGroupTestsBy: string
}

export const mkStateView = (opts = {}): View => {
    return defaults(opts, {
        viewMode: ViewMode.ALL,
        testNameFilter: '',
        useRegexFilter: false,
        useMatchCaseFilter: false,
        strictMatchFilter: false,
        filteredBrowsers: [],
        keyToGroupTestsBy: ''
    });
};
