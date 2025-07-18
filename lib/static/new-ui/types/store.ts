import {CoordBounds} from 'looks-same';
import {BrowserFeature, DiffModeId, Feature, TestStatus, ViewMode} from '@/constants';
import {
    Attachment,
    BrowserItem,
    ImageFile,
    RefImageFile,
    StoreReporterConfig,
    TestError,
    TestStepCompressed
} from '@/types';
import {HtmlReporterValues} from '@/plugin-api';
import {Point} from '@/static/new-ui/types/index';
import {AcceptableImage} from '@/static/modules/static-image-accepter';
import {CheckStatus} from '@/constants/checked-statuses';
import {EntityType} from '@/static/new-ui/features/suites/components/SuitesPage/types';
import {DbDetails} from '@/db-utils/common';
import {Stats, PerBrowserStats} from '@/tests-tree-builder/static';

export interface GroupEntity {
    id: string;
    /** @note For cosmetic purposes, grouping key. For example: "url". */
    key: string;
    /** @note For cosmetic purposes, group value. For example: "https://example.com" */
    label: string;
    resultIds: string[];
    browserIds: string[];
    type: EntityType.Group;
}

export interface SuiteEntityNode {
    id: string;
    name: string;
    parentId: string | null;
    status: TestStatus;
    suiteIds: string[];
    suitePath: string[];
}

export interface SuiteEntityLeaf {
    id: string;
    name: string;
    parentId: string | null;
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
    imageIds: string[];
    parentId: string;
}

export const isSuiteEntity = (entity: SuiteEntity | BrowserEntity | GroupEntity): entity is SuiteEntity => Boolean((entity as SuiteEntity).suitePath);
export const isBrowserEntity = (entity: SuiteEntity | BrowserEntity): entity is BrowserEntity => Boolean((entity as BrowserEntity).resultIds);
export const isGroupEntity = (entity: SuiteEntity | BrowserEntity | GroupEntity): entity is GroupEntity => (entity as GroupEntity).type === EntityType.Group;

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
    skipReason?: string;
    duration?: number;
    attachments?: Attachment[];
}

export interface ResultEntityError extends ResultEntityCommon {
    error: TestError;
    status: TestStatus.ERROR | TestStatus.FAIL;
}

export type ResultEntity = ResultEntityCommon | ResultEntityError;

export const isResultEntityError = (result: ResultEntity): result is ResultEntityError => result.status === TestStatus.ERROR;

interface ImageEntityCommon {
    id: string;
    /** @note Corresponding ResultEntity id */
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
    checkStatus: CheckStatus;
}

export interface BrowserState {
    shouldBeShown: boolean;
    retryIndex: number;
    lastMatchedRetryIndex?: number | null;
    // True if test is not shown because of its status. Useful when computing counts by status.
    isHiddenBecauseOfStatus?: boolean;
    checkStatus: CheckStatus;
    // Measured from 0 to 1, higher is better
    fuzzyMatchScore?: number;
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
    groups: {
        byId: Record<string, GroupEntity>;
        allRootIds: string[];
    };
}

export interface GroupBySection {
    id: string;
    label: string;
}

export enum GroupByType {
    Meta = 'meta',
    Error = 'error',
}

export interface GroupByMetaExpression {
    id: string;
    type: GroupByType.Meta;
    sectionId?: string;
    // Key in meta to group tests by
    key: string;
}

export interface GroupByErrorExpression {
    id: string;
    type: GroupByType.Error;
    sectionId?: string;
}

export type GroupByExpression = GroupByMetaExpression | GroupByErrorExpression;

export enum SortType {
    ByName,
    ByFailedRuns,
    ByTestsCount,
    ByStartTime,
    ByDuration,
    ByRelevance
}

export enum SortDirection {
    Asc = 'asc',
    Desc = 'desc'
}

export interface SortByExpression {
    id: string;
    type: SortType;
    label: string;
}

export enum TreeViewMode {
    Tree = 'tree',
    List = 'list'
}

export interface SnapshotsPlayerHighlightState {
    isActive: boolean;
    highlightStartTime: number;
    highlightEndTime: number;
    goToTime: number;
}

export enum Page {
    suitesPage = 'suitesPage',
    visualChecksPage = 'visualChecksPage',
}

export interface State {
    app: {
        isNewUi: boolean;
        isInitialized: boolean;
        availableFeatures: Feature[],
        [Page.suitesPage]: {
            currentTreeNodeId: string | null;
            currentBrowserId: string | null;
            currentGroupId: string | null;
            currentStepId: string | null;
            // Is used when hovering over a timeline of a snapshots player to highlight corresponding step
            currentHighlightedStepId: string | null;

            // Filters in top of sidebar
            nameFilter: string;
            useRegexFilter: boolean;
            useMatchCaseFilter: boolean;
            viewMode: ViewMode;
            filteredBrowsers: BrowserItem[];
        };
        [Page.visualChecksPage]: {
            currentNamedImageId: string | null;

            // Filters in top of sidebar
            nameFilter: string;
            useRegexFilter: boolean;
            useMatchCaseFilter: boolean;
            viewMode: ViewMode;
            filteredBrowsers: BrowserItem[];
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
        groupTestsData: {
            availableSections: GroupBySection[];
            availableExpressions: GroupByExpression[];
            currentExpressionIds: string[];
        };
        sortTestsData: {
            availableExpressions: SortByExpression[];
            currentExpressionIds: string[];
            currentDirection: SortDirection;
            // Used to restore the previous state that was set by user, for example after clearing search filter
            previousExpressionIds: string[];
            previousDirection: SortDirection;
        };
        guiServerConnection: {
            isConnected: boolean;
        };
        snapshotsPlayer: SnapshotsPlayerHighlightState
    };
    ui: {
        [Page.suitesPage]: {
            treeViewMode: TreeViewMode;
            retryIndexByTreeNodeId: Record<string, number | null>;
            expandedTreeNodesById: Record<string, boolean>;
            expandedSectionsById: Record<string, boolean>;
            expandedStepsByResultId: Record<string, Record<string, boolean>>;
            sectionSizes: number[];
            // Used to restore the previous sections sizes after collapsing the tree with a button
            backupSectionSizes: number[];
            isSnapshotsPlayerVisible: boolean;
        };
        [Page.visualChecksPage]: {
            sectionSizes: number[];
            // Used to restore the previous sections sizes after collapsing the tree with a button
            backupSectionSizes: number[];
        };
        staticImageAccepterToolbar: {
            offset: Point;
        };
    };
    browsers: BrowserItem[];
    browserFeatures: Record<string, BrowserFeature[]>;
    tree: TreeEntity;
    view: {
        diffMode: DiffModeId;
        /** @deprecated Use tree.groups instead. */
        keyToGroupTestsBy: string;
        baseHost: string;
    };
    running: boolean;
    processing: boolean;
    gui: boolean;
    apiValues: HtmlReporterValues;
    config: StoreReporterConfig;
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
    timestamp: number;
    fetchDbDetails: DbDetails[];
    stats: {all: Stats | Record<string, never>, perBrowser: PerBrowserStats | undefined} | null;
}

declare module 'react-redux' {
    // eslint-disable-next-line @typescript-eslint/no-empty-interface
    export interface DefaultRootState extends State {}
}
