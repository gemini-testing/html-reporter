import {configDefaults} from '../../constants/defaults';
import {ViewMode} from '../../constants/view-modes';
import {DiffModes} from '../../constants/diff-modes';
import {EXPAND_ERRORS} from '../../constants/expand-modes';
import {RESULT_KEYS} from '../../constants/group-tests';
import {ToolName} from '../../constants';
import {State} from '@/static/new-ui/types/store';

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
        reportsSaver: {saveReportData: () => ''}
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
        viewMode: ViewMode.ALL,
        diffMode: DiffModes.THREE_UP.id,
        expand: EXPAND_ERRORS,
        baseHost: '',
        testNameFilter: '',
        strictMatchFilter: false,
        filteredBrowsers: [],
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
        isInitialized: false,
        availableFeatures: [],
        suitesPage: {
            currentBrowserId: null,
            currentTreeNodeId: null,
            currentGroupId: null
        },
        visualChecksPage: {
            currentNamedImageId: null
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
        }
    },
    ui: {
        suitesPage: {
            retryIndexByTreeNodeId: {},
            expandedSectionsById: {},
            expandedStepsByResultId: {},
            expandedTreeNodesById: {}
        },
        staticImageAccepterToolbar: {
            offset: {x: 0, y: 0}
        }
    }
}) satisfies State;
