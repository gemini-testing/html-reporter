import EventsEmitter2 from 'eventemitter2';
import {PluginEvents, ToolName} from './constants';
import {downloadDatabases, getTestsTreeFromDatabase, mergeDatabases} from './db-utils/server';
import {LocalImageFileSaver} from './local-image-file-saver';
import {version} from '../package.json';
import {ImageFileSaver, ReporterConfig, ReportsSaver} from './types';

export interface HtmlReporterValues {
    toolName: ToolName;
    extraItems: Record<string, string>;
    metaInfoExtenders: Record<string, string>;
    imagesSaver: ImageFileSaver;
    reportsSaver: ReportsSaver | null;
}

interface ReporterOptions {
    toolName: ToolName;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ParametersExceptFirst<F> = F extends (arg0: any, ...rest: infer R) => any ? R : never;

export class HtmlReporter extends EventsEmitter2 {
    protected _config: ReporterConfig;
    protected _values: HtmlReporterValues;
    protected _version: string;

    static create<T extends HtmlReporter>(
        this: new (config: ReporterConfig, options?: Partial<ReporterOptions>) => T,
        config: ReporterConfig,
        options?: Partial<ReporterOptions>
    ): T {
        return new this(config, options);
    }

    constructor(config: ReporterConfig, {toolName}: Partial<ReporterOptions> = {}) {
        super();

        this._config = config;
        this._values = {
            toolName: toolName ?? ToolName.Hermione,
            extraItems: {},
            metaInfoExtenders: {},
            imagesSaver: LocalImageFileSaver,
            reportsSaver: null
        };
        this._version = version;
    }

    get config(): ReporterConfig {
        return this._config;
    }

    get version(): string {
        return this._version;
    }

    get events(): typeof PluginEvents {
        return PluginEvents;
    }

    addExtraItem(key: string, value: string): void {
        this._values.extraItems[key] = value;
    }

    get extraItems(): Record<string, string> {
        return this._values.extraItems;
    }

    addMetaInfoExtender(key: string, value: string): void {
        this._values.metaInfoExtenders[key] = value;
    }

    get metaInfoExtenders(): Record<string, string> {
        return this._values.metaInfoExtenders;
    }

    set imagesSaver(imagesSaver: ImageFileSaver) {
        this.emit(PluginEvents.IMAGES_SAVER_UPDATED, imagesSaver);
        this._values.imagesSaver = imagesSaver;
    }

    get imagesSaver(): ImageFileSaver {
        return this._values.imagesSaver;
    }

    set reportsSaver(reportsSaver: ReportsSaver) {
        this._values.reportsSaver = reportsSaver;
    }

    get reportsSaver(): ReportsSaver | null {
        return this._values.reportsSaver;
    }

    get values(): HtmlReporterValues {
        return this._values;
    }

    downloadDatabases(...args: Parameters<typeof downloadDatabases>): ReturnType<typeof downloadDatabases> {
        return downloadDatabases(...args);
    }

    mergeDatabases(...args: Parameters<typeof mergeDatabases>): ReturnType<typeof mergeDatabases> {
        return mergeDatabases(...args);
    }

    getTestsTreeFromDatabase(...args: ParametersExceptFirst<typeof getTestsTreeFromDatabase>): ReturnType<typeof getTestsTreeFromDatabase> {
        return getTestsTreeFromDatabase(this.values.toolName, ...args);
    }
}
