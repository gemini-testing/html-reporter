import {DiffModes} from './diff-modes';
import {ViewMode} from './view-modes';

export const CIRCLE_RADIUS = 150;

export const configDefaults = {
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
} as const;
