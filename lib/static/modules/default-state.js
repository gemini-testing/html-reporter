'use strict';

const {configDefaults} = require('../../constants/defaults');
const {ViewMode} = require('../../constants/view-modes');
const {DiffModes} = require('../../constants/diff-modes');
const {EXPAND_ERRORS} = require('../../constants/expand-modes');
const {RESULT_KEYS} = require('../../constants/group-tests');

export default Object.assign({config: configDefaults}, {
    gui: true,
    running: false,
    processing: false,
    stopping: false,
    autoRun: false,
    skips: [],
    browsers: [],
    groupedTests: {
        result: {
            byKey: RESULT_KEYS.reduce((acc, v) => ({...acc, [v]: []}), {}),
            allKeys: RESULT_KEYS
        },
        meta: {
            byKey: {},
            allKeys: []
        }
    },
    tree: {
        suites: {
            byId: {},
            allIds: [],
            allRootIds: [],
            failedRootIds: []
        },
        browsers: {
            byId: {},
            stateById: {},
            allIds: []
        },
        results: {
            byId: {},
            allIds: []
        },
        images: {
            byId: {},
            stateById: {},
            allIds: []
        }
    },
    closeIds: [],
    apiValues: {
        extraItems: {},
        metaInfoExtenders: {}
    },
    loading: {},
    modals: [],
    stats: {
        all: {
            total: 0,
            updated: 0,
            passed: 0,
            failed: 0,
            skipped: 0,
            retries: 0,
            warned: 0
        },
        perBrowser: {}
    },
    view: {
        viewMode: ViewMode.ALL,
        diffMode: DiffModes.THREE_UP.id,
        expand: EXPAND_ERRORS,
        baseHost: '',
        testNameFilter: '',
        strictMatchFilter: false,
        filteredBrowsers: [],
        keyToGroupTestsBy: ''
    },
    db: undefined,
    fetchDbDetails: [],
    progressBar: {
        currentRootSuiteId: null
    },
    notifications: []
});
