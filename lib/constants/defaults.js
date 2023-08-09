'use strict';

const {DiffModes} = require('./diff-modes');
const {ViewMode} = require('./view-modes');

module.exports = {
    CIRCLE_RADIUS: 150,
    config: {
        saveErrorDetails: false,
        commandsWithShortHistory: [],
        defaultView: ViewMode.ALL,
        diffMode: DiffModes.THREE_UP.id,
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
