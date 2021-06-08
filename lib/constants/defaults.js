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
        lazyLoadOffset: 800,
        errorPatterns: [],
        metaInfoBaseUrls: {},
        reportMetaInfo: {},
        customGui: {},
        customScripts: [],
        yandexMetrika: {
            counterNumber: null
        },
        pluginsEnabled: false,
        plugins: []
    }
};
