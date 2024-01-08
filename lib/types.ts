import type {LooksSameOptions, CoordBounds} from 'looks-same';
import type {default as Hermione, TestResult as HermioneTestResultOriginal} from 'hermione';
import {DiffModeId, SaveFormat, SUITES_TABLE_COLUMNS, TestStatus, ViewMode} from './constants';
import type {HtmlReporter} from './plugin-api';
import {ImageDiffError, NoRefImageError} from './errors';

declare module 'tmp' {
    export const tmpdir: string;
}

export {Suite as HermioneSuite} from 'hermione';

export interface HermioneTestResult extends HermioneTestResultOriginal {
    timestamp?: number;
}

export interface ImageFileSaver {
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

export interface ImageFile {
    path: string;
    size: ImageSize;
}

export interface ImageBuffer {
    buffer: Buffer;
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

export interface TestError {
    name: string;
    message: string;
    stack?: string;
    stateName?: string;
    details?: ErrorDetails
    screenshot?: ImageBase64 | ImageFile
}

export interface ImageInfoDiff {
    status: TestStatus.FAIL;
    stateName: string;
    // Ref image is absent in pwt test results
    refImg?: ImageFile;
    diffClusters?: CoordBounds[];
    expectedImg: ImageFile;
    actualImg: ImageFile;
    diffImg?: ImageFile | ImageBuffer;
    diffOptions: DiffOptions;
}

interface AssertViewSuccess {
    stateName: string;
    refImg: ImageFile;
}

export interface ImageInfoSuccess {
    status: TestStatus.SUCCESS;
    stateName: string;
    // Ref image may be absent in pwt test results
    refImg?: ImageFile;
    diffClusters?: CoordBounds[];
    expectedImg: ImageFile;
    actualImg?: ImageFile;
}

export interface ImageInfoPageSuccess {
    status: TestStatus.SUCCESS;
    actualImg: ImageFile | ImageBase64;
}

export interface ImageInfoPageError {
    status: TestStatus.ERROR;
    actualImg: ImageFile | ImageBase64;
}

export interface ImageInfoNoRef {
    status: TestStatus.ERROR;
    error?: TestError;
    stateName: string;
    // Ref image may be absent in pwt test results
    refImg?: ImageFile;
    actualImg: ImageFile;
}

export interface ImageInfoUpdated {
    status: TestStatus.UPDATED;
    stateName: string;
    refImg: ImageFile;
    actualImg: ImageFile;
    expectedImg: ImageFile;
}

export type ImageInfoWithState = ImageInfoDiff | ImageInfoSuccess | ImageInfoNoRef | ImageInfoUpdated;

export type ImageInfoFull = ImageInfoWithState | ImageInfoPageSuccess | ImageInfoPageError;

export type ImageInfo =
    | Omit<ImageInfoDiff, 'status' | 'stateName'>
    | Omit<ImageInfoSuccess, 'status' | 'stateName'>
    | Omit<ImageInfoNoRef, 'status' | 'stateName'>
    | Omit<ImageInfoPageSuccess, 'status' | 'stateName'>;

export type AssertViewResult = (AssertViewSuccess | ImageDiffError | NoRefImageError) & {isUpdated?: boolean};

export interface TestSpecByPath {
    testPath: string[];
    browserId: string;
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

export type RawSuitesRow = [
    suitePath: string,
    suiteName: string,
    name: string,
    suiteUrl: string,
    metaInfo: string,
    history: string,
    description: string,
    error: string,
    skipReason: string,
    imagesInfo: string,
    screenshot: number,
    multipleTabs: number,
    status: string,
    timestamp: number,
];

export type LabeledSuitesRow = {
    [K in (typeof SUITES_TABLE_COLUMNS)[number]['name']]: string;
};
