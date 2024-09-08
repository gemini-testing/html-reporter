import type axios from 'axios';
import type {LooksSameOptions, CoordBounds} from 'looks-same';
import type {default as Testplane, TestResult} from 'testplane';
import {DiffModeId, SaveFormat, SUITES_TABLE_COLUMNS, TestStatus, ViewMode} from './constants';
import type {HtmlReporter} from './plugin-api';
import {ImageDiffError, NoRefImageError} from './errors';

declare module 'tmp' {
    export const tmpdir: string;
}

export type {Suite as TestplaneSuite} from 'testplane';

export interface HermioneTestResult extends TestResult {
    timestamp?: number;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface TestplaneTestResult extends HermioneTestResult {}

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

export interface RefImageFile extends ImageFile {
    /**
     * @note defined if testplane >= 8.13.0
     */
    relativePath?: string;
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
    /**
     * @note defined if testplane >= 8.11.0
     */
    snippet?: string;
    stack?: string;
    stateName?: string;
    details?: ErrorDetails
    screenshot?: ImageBase64 | ImageFile
}

export interface ImageInfoDiff {
    status: TestStatus.FAIL;
    stateName: string;
    /**
     * @note Ref image is absent in pwt test results
     */
    refImg?: RefImageFile;
    diffClusters?: CoordBounds[];
    expectedImg: ImageFile;
    actualImg: ImageFile;
    diffImg?: ImageFile | ImageBuffer;
    diffOptions: DiffOptions;
    /**
     * @note defined if hermione >= 8.2.0
     */
    differentPixels?: number;
    /**
     * @note defined if hermione >= 8.2.0
     */
    diffRatio?: number;
}

interface AssertViewSuccess {
    stateName: string;
    refImg: RefImageFile;
}

export interface ImageInfoSuccess {
    status: TestStatus.SUCCESS;
    stateName: string;
    /**
     * @note Ref image is absent in pwt test results
     */
    refImg?: RefImageFile;
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
    /**
     * @note Ref image is absent in pwt test results
     */
    refImg?: RefImageFile;
    actualImg: ImageFile;
}

export interface ImageInfoUpdated {
    status: TestStatus.UPDATED;
    stateName: string;
    refImg: RefImageFile;
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
    initialize?: (data: {
        testplane: Testplane,
        /**
         * @deprecated Use `testplane` instead
         */
        hermione: Testplane,
        ctx: object
    }) => void | Promise<void>;
    action: (data: {
        testplane: Testplane,
        /**
         * @deprecated Use `testplane` instead
         */
        hermione: Testplane,
        ctx: object,
        control: object
    }) => void | Promise<void>;
}

type AxiosPost = typeof axios['post'];
type AxiosRequestOptions = Parameters<AxiosPost>[2];

export interface StaticImageAccepterConfig {
    enabled: boolean;
    repositoryUrl: string;
    pullRequestUrl: string;
    serviceUrl: string;
    axiosRequestOptions?: AxiosRequestOptions;
    meta: Record<string, unknown>;
}

export interface StaticImageAccepterRequest extends Pick<StaticImageAccepterConfig, 'repositoryUrl' | 'pullRequestUrl'> {
    message: string;
    meta?: StaticImageAccepterConfig['meta'];
    imagesInfo: Array<{
        /**
         * @note base64
         */
        image: string;
        /**
         * @note relative to repository root
         */
        path: string;
    }>;
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
    staticImageAccepter: StaticImageAccepterConfig;
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

export interface BrowserItem {
    id: string;
    versions: string[];
}

export enum TestStepKey {
    Name = 'n',
    Args = 'a',
    Duration = 'd',
    IsFailed = 'f',
    Children = 'c',
    IsGroup = 'g'
}

export interface TestStepCompressed {
    [TestStepKey.Name]: string;
    [TestStepKey.Args]: string[];
    [TestStepKey.Duration]: number;
    [TestStepKey.IsFailed]: boolean;
    [TestStepKey.IsGroup]: boolean;
    [TestStepKey.Children]?: TestStepCompressed[];
}
