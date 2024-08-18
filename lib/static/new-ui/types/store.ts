import {TestStatus, ViewMode} from '@/constants';
import {ImageFile} from '@/types';

export interface SuiteEntityNode {
    name: string;
    status: TestStatus;
    suiteIds: string[];
}

export interface SuiteEntityLeaf {
    name: string;
    status: TestStatus;
    browserIds: string[];
}

export type SuiteEntity = SuiteEntityNode | SuiteEntityLeaf;

export const isSuiteEntityLeaf = (suite: SuiteEntity): suite is SuiteEntityLeaf => Boolean((suite as SuiteEntityLeaf).browserIds);

export interface BrowserEntity {
    name: string;
    resultIds: string[];
}

export interface ResultEntityCommon {
    parentId: string;
    attempt: number;
    imageIds: string[];
    status: TestStatus;
    timestamp: number;
}

export interface ResultEntityError extends ResultEntityCommon {
    error: Error;
    status: TestStatus.ERROR;
}

export type ResultEntity = ResultEntityCommon | ResultEntityError;

export const isResultEntityError = (result: ResultEntity): result is ResultEntityError => result.status === TestStatus.ERROR;

export interface ImageEntityError {
    status: TestStatus.ERROR;
}

export interface ImageEntityFail {
    stateName: string;
    diffImg: ImageFile;
}

export type ImageEntity = ImageEntityError | ImageEntityFail;

export const isImageEntityFail = (image: ImageEntity): image is ImageEntityFail => Boolean((image as ImageEntityFail).stateName);

export interface SuiteState {
    shouldBeOpened: boolean;
    shouldBeShown: boolean;
}

export interface BrowserState {
    shouldBeShown: boolean;
}

export interface State {
    app: {
        isInitialized: boolean;
        currentSuiteId: string | null;
    }
    tree: {
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
        };
        suites: {
            allRootIds: string[];
            byId: Record<string, SuiteEntity>;
            stateById: Record<string, SuiteState>;
        };
    }
    view: {
        testNameFilter: string;
        viewMode: ViewMode;
    }
}
