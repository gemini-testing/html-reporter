'use strict';

const diffModes = require('./diff-modes');
const viewModes = require('./view-modes');

module.exports = {
    CIRCLE_RADIUS: 150,
    config: {
        saveErrorDetails: false,
        commandsWithShortHistory: [],
        defaultView: viewModes.ALL,
        diffMode: diffModes.THREE_UP.id,
        baseHost: '',
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
