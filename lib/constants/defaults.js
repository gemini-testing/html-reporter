'use strict';

const viewModes = require('./view-modes');

module.exports = {
    CIRCLE_RADIUS: 150,
    config: {
        saveErrorDetails: false,
        commandsWithShortHistory: [],
        defaultView: viewModes.ALL,
        baseHost: '',
        scaleImages: false,
        lazyLoadOffset: null,
        errorPatterns: [],
        metaInfoBaseUrls: {},
        customGui: {},
        customScripts: [],
        yandexMetrika: {
            counterNumber: null
        },
        pluginsEnabled: false,
        plugins: []
    }
};
