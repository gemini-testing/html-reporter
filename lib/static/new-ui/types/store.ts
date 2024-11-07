import {DiffModeId, Feature, TestStatus, ViewMode} from '@/constants';
import {BrowserItem, ImageFile, RefImageFile, ReporterConfig, TestError, TestStepCompressed} from '@/types';
import {HtmlReporterValues} from '@/plugin-api';
import {CoordBounds} from 'looks-same';
import {Point} from '@/static/new-ui/types/index';
import {AcceptableImage} from '@/static/modules/static-image-accepter';

export interface SuiteEntityNode {
    id: string;
    name: string;
    status: TestStatus;
    suiteIds: string[];
    suitePath: string[];
}

export interface SuiteEntityLeaf {
    id: string;
    name: string;
    status: TestStatus;
    browserIds: string[];
    suitePath: string[];
}

export type SuiteEntity = SuiteEntityNode | SuiteEntityLeaf;

export const hasBrowsers = (suite: SuiteEntity): suite is SuiteEntityLeaf => Boolean((suite as SuiteEntityLeaf).browserIds);
export const hasSuites = (suite: SuiteEntity): suite is SuiteEntityNode => Boolean((suite as SuiteEntityNode).suiteIds);

export interface BrowserEntity {
    id: string;
    name: string;
    resultIds: string[];
    parentId: string;
}

export interface ResultEntityCommon {
    id: string;
    parentId: string;
    attempt: number;
    imageIds: string[];
    status: TestStatus;
    timestamp: number;
    metaInfo: Record<string, string>;
    suiteUrl?: string;
    history?: TestStepCompressed[];
    error?: TestError;
    suitePath: string[];
    /** @note Browser Name/ID, e.g. `chrome-desktop` */
    name: string;
}

export interface ResultEntityError extends ResultEntityCommon {
    error: TestError;
    status: TestStatus.ERROR | TestStatus.FAIL;
}

export type ResultEntity = ResultEntityCommon | ResultEntityError;

export const isResultEntityError = (result: ResultEntity): result is ResultEntityError => result.status === TestStatus.ERROR;

interface ImageEntityCommon {
    id: string;
    parentId: string;
}

export interface ImageEntitySuccess extends ImageEntityCommon {
    status: TestStatus.SUCCESS;
    stateName: string;
    expectedImg: ImageFile;
    refImg: RefImageFile;
}

export interface ImageEntityUpdated extends ImageEntityCommon {
    status: TestStatus.UPDATED;
    stateName: string;
    expectedImg: ImageFile;
    refImg: RefImageFile;
}

export interface ImageEntityStaged extends ImageEntityCommon {
    status: TestStatus.STAGED;
    stateName: string;
    actualImg: ImageFile;
    refImg: RefImageFile;
}

export interface ImageEntityCommitted extends ImageEntityCommon {
    status: TestStatus.COMMITED;
    stateName: string;
    actualImg: ImageFile;
    refImg: RefImageFile;
}

export interface ImageEntityError extends ImageEntityCommon {
    status: TestStatus.ERROR;
    stateName?: string;
    actualImg: ImageFile;
    error?: TestError;
    refImg?: RefImageFile;
}

export interface ImageEntityFail extends ImageEntityCommon {
    status: TestStatus.FAIL;
    stateName: string;
    diffClusters: CoordBounds[];
    diffImg: ImageFile;
    actualImg: ImageFile;
    expectedImg: ImageFile;
    refImg: RefImageFile;
}

export type ImageEntity = ImageEntityError | ImageEntityFail | ImageEntitySuccess | ImageEntityUpdated | ImageEntityStaged | ImageEntityCommitted;

export const isImageEntityFail = (image: ImageEntity): image is ImageEntityFail => Boolean((image as ImageEntityFail).stateName);

export interface SuiteState {
    shouldBeOpened: boolean;
    shouldBeShown: boolean;
}

export interface BrowserState {
    shouldBeShown: boolean;
    retryIndex: number;
    // True if test is not shown because of its status. Useful when computing counts by status.
    isHiddenBecauseOfStatus?: boolean;
}

export interface ResultState {
    matchedSelectedGroup: boolean;
}

export interface TreeEntity {
    browsers: {
        allIds: string[];
        byId: Record<string, BrowserEntity>;
        stateById: Record<string, BrowserState>
    };
    images: {
        byId: Record<string, ImageEntity>;
    }
    results: {
        byId: Record<string, ResultEntity>;
        stateById: Record<string, ResultState>;
    };
    suites: {
        allRootIds: string[];
        byId: Record<string, SuiteEntity>;
        stateById: Record<string, SuiteState>;
    };
}

export interface State {
    app: {
        isInitialized: boolean;
        availableFeatures: Feature[],
        suitesPage: {
            currentBrowserId: string | null;
        };
        visualChecksPage: {
            currentNamedImageId: string | null;
        };
        loading: {
            /** @note Determines whether the loading bar is visible */
            isVisible: boolean;
            /** @note Determines visibility of bouncing dots at the end of the task title */
            isInProgress: boolean;
            taskTitle: string;
            /** @note Maps ID of a resource to its loading progress. E.g. dbUrl: 88. Progress is measured from 0 to 1. */
            progress: Record<string, number>;
        };
        staticImageAccepterModal: {
            commitMessage: string;
        };
    };
    ui: {
        suitesPage: {
            expandedSectionsById: Record<string, boolean>;
            expandedStepsByResultId: Record<string, Record<string, boolean>>;
        };
        staticImageAccepterToolbar: {
            offset: Point;
        };
    };
    browsers: BrowserItem[];
    tree: TreeEntity;
    view: {
        diffMode: DiffModeId;
        testNameFilter: string;
        viewMode: ViewMode;
        filteredBrowsers: BrowserItem[];
        keyToGroupTestsBy: string;
        baseHost: string;
    };
    running: boolean;
    processing: boolean;
    gui: boolean;
    apiValues: HtmlReporterValues;
    config: ReporterConfig;
    staticImageAccepter: {
        enabled: boolean;
        acceptableImages: Record<string, AcceptableImage>;
        accepterDelayedImages: {
            imageId: string;
            stateName: string;
            stateNameImageId: string;
        }[];
        imagesToCommitCount: number;
    };
}
