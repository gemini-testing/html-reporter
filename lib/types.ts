import type {LooksSameOptions, CoordBounds} from 'looks-same';
import type {default as Hermione, TestResult as HermioneTestResultOriginal} from 'hermione';
import {DiffModeId, SaveFormat, TestStatus, ViewMode} from './constants';
import type {HtmlReporter} from './plugin-api';
import {ImageDiffError, NoRefImageError} from './errors';

declare module 'tmp' {
    export const tmpdir: string;
}

export {Suite as HermioneSuite} from 'hermione';

export interface HermioneTestResult extends HermioneTestResultOriginal {
    timestamp?: number;
    updated?: boolean;
    origAttempt?: number;
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

interface AssertViewSuccess {
    stateName: string;
    refImg: ImageData;
}

export interface ImageInfoSuccess {
    status: TestStatus.SUCCESS | TestStatus.UPDATED;
    stateName: string;
    refImg?: ImageData;
    diffClusters?: CoordBounds[];
    expectedImg: ImageData;
    actualImg?: ImageData;
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

export type AssertViewResult = AssertViewSuccess | ImageDiffError | NoRefImageError;

export interface TestError {
    message: string;
    stack?: string;
    stateName?: string;
    details?: ErrorDetails
    screenshot?: ImageBase64
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
