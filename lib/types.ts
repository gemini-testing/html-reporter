import {DiffMode, ViewMode} from './constants';
import type Hermione from 'hermione';
import type HtmlReporter from './plugin-api';

export interface Suite {
    readonly root: boolean;
    readonly title: string;
    parent: Suite | null;
}

export interface HtmlReporterApi {
    htmlReporter: HtmlReporter;
}

export interface PluginDescription {
    name: string;
}

export interface CustomGuiItem {
    type: string;
    controls: {label: string; value: string;}[];
    initialize?: (data: {hermione: Hermione, ctx: object}) => void | Promise<void>;
    action: (data: {hermione: Hermione, ctx: object, control: object}) => void | Promise<void>;
}

export interface ReporterConfig {
    baseHost: string;
    defaultView: ViewMode;
    customGui: Record<string, CustomGuiItem[]>;
    customScripts: object[];
    diffMode: DiffMode;
    errorPatterns: object[];
    metaInfoBaseUrls: Record<string, string>;
    path: string;
    plugins: PluginDescription[];
    pluginsEnabled: boolean;
    yandexMetrika: { counterNumber: null | number };
}
