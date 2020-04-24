'use strict';

const defaults = require('../../constants/defaults');

export default Object.assign(defaults, {
    gui: true,
    running: false,
    processing: false,
    autoRun: false,
    skips: [],
    browsers: [],
    groupedErrors: [],
    suites: {},
    suiteIds: {
        all: [],
        failed: []
    },
    closeIds: [],
    apiValues: {
        extraItems: {},
        metaInfoExtenders: {}
    },
    loading: {},
    modal: {},
    stats: {
        total: 0,
        updated: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        retries: 0,
        warned: 0
    },
    view: {
        viewMode: 'all',
        expand: 'errors',
        showSkipped: false,
        showOnlyDiff: false,
        scaleImages: false,
        baseHost: '',
        testNameFilter: '',
        strictMatchFilter: false,
        filteredBrowsers: [],
        groupByError: false
    },
    db: undefined,
    fetchDbDetails: undefined
});
