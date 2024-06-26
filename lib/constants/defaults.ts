import {DiffModes} from './diff-modes';
import {ViewMode} from './view-modes';
import {ReporterConfig} from '../types';
import {SaveFormat} from './save-formats';

export const CIRCLE_RADIUS = 150;

export const configDefaults: ReporterConfig = {
    baseHost: '',
    commandsWithShortHistory: [],
    customGui: {},
    customScripts: [],
    defaultView: ViewMode.ALL,
    diffMode: DiffModes.THREE_UP.id,
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
        counterNumber: null
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
