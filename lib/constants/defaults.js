'use strict';

const viewModes = require('./view-modes');

module.exports = {
    CIRCLE_RADIUS: 150,
    config: {
        saveErrorDetails: false,
        defaultView: viewModes.ALL,
        baseHost: '',
        scaleImages: false,
        lazyLoadOffset: 800,
        errorPatterns: [],
        metaInfoBaseUrls: {},
        customGui: {},
        customScripts: []
    }
};
