import type {LooksSameOptions, CoordBounds} from 'looks-same';
import type {default as Hermione} from 'hermione';
import {DiffModeId, SaveFormat, TestStatus, ViewMode} from './constants';
import type {HtmlReporter} from './plugin-api';

declare module 'tmp' {
    export const tmpdir: string;
}

interface ConfigurableTestObject {
    browserId: string;
    browserVersion?: string;
    id: string;
    file: string;
    skipReason: string;
}

export interface Suite extends ConfigurableTestObject {
    readonly root: boolean;
    readonly title: string;
    parent: Suite | null;
}

export interface ImagesSaver {
    saveImg: (localFilePath: string, options: {destPath: string; reportDir: string}) => string | Promise<string>;
}

export interface ReportsSaver {
    saveReportData: (localDbPath: string, options: {destPath: string; reportDir: string}) => string | Promise<string>;
}

export interface ErrorDetails {
    title: string;
    data?: unknown;
    filePath: string;
}

export interface ImageSize {
    width: number;
    height: number;
}

export interface ImageData {
    path: string;
    size: ImageSize;
}

export interface ImageBase64 {
    base64: string;
    size: ImageSize
}

export interface DiffOptions extends LooksSameOptions {
    current: string;
    reference: string;
    diffColor: string;
}

export interface ImageInfoFail {
    status: TestStatus.FAIL;
    stateName: string;
    refImg?: ImageData;
    diffClusters?: CoordBounds[];
    expectedImg: ImageData;
    actualImg: ImageData;
    diffImg: ImageData;
}

export interface ImageInfoSuccess {
    status: TestStatus.SUCCESS | TestStatus.UPDATED;
    stateName: string;
    refImg?: ImageData;
    diffClusters?: CoordBounds[];
    expectedImg: ImageData;
}

export interface ImageInfoError {
    status: TestStatus.ERROR;
    error?: {message: string; stack: string;}
    stateName?: string;
    refImg?: ImageData;
    diffClusters?: CoordBounds[];
    actualImg: ImageData;
}

export type ImageInfoFull = ImageInfoFail | ImageInfoSuccess | ImageInfoError;

export type ImageInfo =
    | Omit<ImageInfoFail, 'status' | 'stateName'>
    | Omit<ImageInfoSuccess, 'status' | 'stateName'>
    | Omit<ImageInfoError, 'status' | 'stateName'>;

export interface ImageDiffError {
    stateName: string;
    diffOpts: DiffOptions;
    currImg: ImageData;
    refImg: ImageData;
    diffClusters: CoordBounds[];
    diffBuffer?: ArrayBuffer;
}

export type AssertViewResult = ImageDiffError;

export interface TestResult extends ConfigurableTestObject {
    assertViewResults: AssertViewResult[];
    description?: string;
    err?: {
        message: string;
        stack: string;
        stateName?: string;
        details: ErrorDetails
    };
    fullTitle(): string;
    title: string;
    meta: Record<string, unknown>
    sessionId: string;
    timestamp: number;
    imagesInfo: ImageInfoFull[];
    origAttempt?: number;
    history: unknown;
    parent: Suite;
}

export interface LabeledSuitesRow {
    imagesInfo: string;
    timestamp: number;
}

export type RawSuitesRow = LabeledSuitesRow[keyof LabeledSuitesRow][];

export interface ParsedSuitesRow {
    description: string | null;
    error: {
        message: string;
        stack: string;
    };
    history: unknown;
    imagesInfo: ImageInfoFull[];
    metaInfo: {
        browserVersion?: string;
        [key: string]: unknown;
    };
    multipleTabs: boolean;
    name: string;
    screenshot: boolean;
    skipReason: string;
    status: TestStatus;
    suiteUrl: string;
}

export interface Attempt {
    attempt: number;
}

export interface HtmlReporterApi {
    htmlReporter: HtmlReporter;
}

export interface ErrorPattern {
    name: string;
    pattern: string;
}

export interface PluginDescription {
    name: string;
    component: string;
    point?: string;
    position?: 'after' | 'before' | 'wrap';
    config?: Record<string, unknown>;
}

export interface CustomGuiItem {
    type: string;
    controls: {label: string; value: string;}[];
    initialize?: (data: {hermione: Hermione, ctx: object}) => void | Promise<void>;
    action: (data: {hermione: Hermione, ctx: object, control: object}) => void | Promise<void>;
}

export interface ReporterConfig {
    baseHost: string;
    commandsWithShortHistory: string[];
    customGui: Record<string, CustomGuiItem[]>;
    customScripts: (() => void)[];
    defaultView: ViewMode;
    diffMode: DiffModeId;
    enabled: boolean;
    errorPatterns: ErrorPattern[];
    lazyLoadOffset: number | null;
    metaInfoBaseUrls: Record<string, string>;
    path: string;
    plugins: PluginDescription[];
    pluginsEnabled: boolean;
    saveErrorDetails: boolean;
    saveFormat: SaveFormat;
    yandexMetrika: { counterNumber: null | number };
}

export type ReporterOptions = Omit<ReporterConfig, 'errorPatterns'> & {errorPatterns: (string | ErrorPattern)[]};

export interface DbUrlsJsonData {
    dbUrls: string[];
    jsonUrls: string[];
}
