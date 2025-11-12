import {
    Page, ToolName, TwoUpFitMode, RESULT_KEYS, EXPAND_ERRORS, DiffModes, ViewMode, configDefaults
} from '@/constants';
import {SortDirection, State, TreeViewMode} from '@/static/new-ui/types/store';
import {MIN_SECTION_SIZE_PERCENT} from '../new-ui/features/suites/constants';

export default Object.assign({config: configDefaults}, {
    gui: true,
    running: false,
    processing: false,
    stopping: false,
    autoRun: false,
    skips: [],
    browsers: [],
    groupedTests: {
        result: {
            byKey: RESULT_KEYS.reduce((acc, v) => ({...acc, [v]: []}), {}),
            allKeys: RESULT_KEYS
        },
        meta: {
            byKey: {},
            allKeys: []
        }
    },
    tree: {
        groups: {
            byId: {},
            allRootIds: []
        },
        suites: {
            byId: {},
            byHash: {},
            allIds: [],
            allRootIds: [],
            failedRootIds: [],
            stateById: {}
        },
        browsers: {
            byId: {},
            stateById: {},
            allIds: []
        },
        results: {
            byId: {},
            stateById: {},
            allIds: []
        },
        images: {
            byId: {},
            stateById: {},
            allIds: []
        }
    },
    closeIds: [],
    apiValues: {
        toolName: ToolName.Testplane,
        extraItems: {},
        metaInfoExtenders: {},
        imagesSaver: {saveImg: () => ''},
        reportsSaver: {saveReportData: () => ''},
        snapshotsSaver: {saveSnapshot: () => ''}
    },
    loading: {},
    modals: [],
    stats: {
        all: {
            total: 0,
            updated: 0,
            passed: 0,
            failed: 0,
            skipped: 0,
            retries: 0,
            warned: 0
        },
        perBrowser: {}
    },
    view: {
        diffMode: DiffModes.THREE_UP.id,
        expand: EXPAND_ERRORS,
        baseHost: '',
        strictMatchFilter: false,
        keyToGroupTestsBy: ''
    },
    db: undefined,
    fetchDbDetails: [],
    progressBar: {
        currentRootSuiteId: null
    },
    notifications: [],
    staticImageAccepter: {
        enabled: false,
        acceptableImages: {},
        accepterDelayedImages: [] as {imageId: string; stateName: string; stateNameImageId: string}[],
        imagesToCommitCount: 0
    },
    app: {
        isNewUi: false,
        isInitialized: false,
        availableFeatures: [],
        [Page.suitesPage]: {
            currentBrowserId: null,
            currentTreeNodeId: null,
            currentGroupId: null,
            currentStepId: null,
            currentHighlightedStepId: null,

            viewMode: ViewMode.ALL,
            nameFilter: '',
            useRegexFilter: false,
            useMatchCaseFilter: false,
            filteredBrowsers: []
        },
        [Page.visualChecksPage]: {
            suiteId: null,
            stateName: null,

            viewMode: ViewMode.ALL,
            nameFilter: '',
            useRegexFilter: false,
            useMatchCaseFilter: false,
            filteredBrowsers: [],
            diffMode: DiffModes.TWO_UP_INTERACTIVE.id
        },
        loading: {
            taskTitle: 'Loading Testplane UI',
            isVisible: true,
            isInProgress: true,
            progress: {}
        },
        staticImageAccepterModal: {
            commitMessage: 'chore: update screenshot references'
        },
        groupTestsData: {
            availableSections: [],
            availableExpressions: [],
            currentExpressionIds: []
        },
        sortTestsData: {
            availableExpressions: [],
            currentExpressionIds: [],
            currentDirection: SortDirection.Asc,
            previousExpressionIds: [],
            previousDirection: SortDirection.Asc
        },
        guiServerConnection: {
            isConnected: false
        },
        snapshotsPlayer: {
            isActive: false,
            highlightStartTime: 0,
            highlightEndTime: 0,
            goToTime: 0
        }
    },
    ui: {
        [Page.suitesPage]: {
            treeViewMode: TreeViewMode.Tree,
            retryIndexByTreeNodeId: {},
            expandedSectionsById: {},
            expandedStepsByResultId: {},
            expandedTreeNodesById: {},
            sectionSizes: [MIN_SECTION_SIZE_PERCENT, 100 - MIN_SECTION_SIZE_PERCENT],
            backupSectionSizes: [MIN_SECTION_SIZE_PERCENT, 100 - MIN_SECTION_SIZE_PERCENT],
            isSnapshotsPlayerVisible: true
        },
        [Page.visualChecksPage]: {
            sectionSizes: [MIN_SECTION_SIZE_PERCENT, 100 - MIN_SECTION_SIZE_PERCENT],
            backupSectionSizes: [MIN_SECTION_SIZE_PERCENT, 100 - MIN_SECTION_SIZE_PERCENT],
            is2UpDiffVisible: true,
            twoUpFitMode: TwoUpFitMode.FitToWidth
        },
        staticImageAccepterToolbar: {
            offset: {x: 0, y: 0}
        }
    },
    timestamp: 0,
    browserFeatures: {}
}) satisfies State;
