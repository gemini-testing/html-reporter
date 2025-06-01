import {DiffModes} from './diff-modes';
import {ViewMode} from './view-modes';
import {StoreReporterConfig} from '../types';
import {SaveFormat} from './save-formats';

export const CIRCLE_RADIUS = 150;

export const configDefaults: StoreReporterConfig = {
    baseHost: '',
    commandsWithShortHistory: [],
    customGui: {},
    customScripts: [],
    defaultView: ViewMode.ALL,
    diffMode: DiffModes.THREE_UP.id,
    uiMode: null,
    enabled: false,
    errorPatterns: [],
    lazyLoadOffset: null,
    metaInfoBaseUrls: {},
    path: '',
    plugins: [],
    pluginsEnabled: false,
    saveErrorDetails: false,
    saveFormat: SaveFormat.SQLITE,
    yandexMetrika: {
        counterNumber: 99267510
    },
    staticImageAccepter: {
        enabled: false,
        repositoryUrl: '',
        pullRequestUrl: '',
        serviceUrl: '',
        meta: {},
        axiosRequestOptions: {}
    }
};
