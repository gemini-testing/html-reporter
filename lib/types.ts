import type {LooksSameOptions, CoordBounds} from 'looks-same';
import type {default as Hermione} from 'hermione';
import {DiffMode, TestStatus, ViewMode} from './constants';
import type HtmlReporter from './plugin-api';

declare module 'tmp' {
    export const tmpdir: string;
}

export interface Suite {
    readonly root: boolean;
    readonly title: string;
    parent: Suite | null;
}

export interface ImagesSaver {
    saveImg: (localFilePath: string, options: {destPath: string; reportDir: string}) => string | Promise<string>;
}

export interface ErrorDetails {
    title: string;
    data: unknown;
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

export interface TestResult {
    assertViewResults: AssertViewResult[];
    description?: string;
    err?: {
        message: string;
        stack: string;
        stateName?: string;
        details: ErrorDetails
    };
    fullTitle(): string;
    id: string;
    title: string;
    meta: Record<string, unknown>
    browserId: string;
    browserVersion?: string;
    sessionId: string;
    timestamp: number;
    imagesInfo: ImageInfoFull[];
    origAttempt?: number;
    history: unknown;
    parent: Suite;
}

export interface RawSuitesRow {
    imagesInfo: string;
}

export interface ParsedSuitesRow {
    status: TestStatus;
    imagesInfo: ImageInfoFull[];
    metaInfo: Record<string, unknown>;
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
