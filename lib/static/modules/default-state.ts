import {configDefaults} from '../../constants/defaults';
import {ViewMode} from '../../constants/view-modes';
import {DiffModes} from '../../constants/diff-modes';
import {EXPAND_ERRORS} from '../../constants/expand-modes';
import {RESULT_KEYS} from '../../constants/group-tests';
import {ToolName} from '../../constants';
import {Page, SortDirection, State, TreeViewMode} from '@/static/new-ui/types/store';
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
            currentNamedImageId: null,

            viewMode: ViewMode.ALL,
            nameFilter: '',
            useRegexFilter: false,
            useMatchCaseFilter: false,
            filteredBrowsers: []
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
            backupSectionSizes: [MIN_SECTION_SIZE_PERCENT, 100 - MIN_SECTION_SIZE_PERCENT]
        },
        staticImageAccepterToolbar: {
            offset: {x: 0, y: 0}
        }
    },
    timestamp: 0,
    browserFeatures: {}
}) satisfies State;
