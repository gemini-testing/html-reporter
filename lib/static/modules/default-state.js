'use strict';

export default {
    gui: true,
    running: false,
    autoRun: false,
    skips: [],
    suites: {},
    suiteIds: {
        all: [],
        failed: []
    },
    config: {
        defaultView: 'all',
        baseHost: ''
    },
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
        showRetries: false,
        showOnlyDiff: false,
        scaleImages: false,
        baseHost: ''
    }
};
