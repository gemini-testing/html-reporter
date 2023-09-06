import axios from 'axios';
import {isEmpty, difference} from 'lodash';
import {notify, dismissNotification as dismissNotify, POSITIONS} from 'reapop';
import {StaticTestsTreeBuilder} from '../../tests-tree-builder/static';
import actionNames from './action-names';
import {types as modalTypes} from '../components/modals';
import {QUEUED} from '../../constants/test-statuses';
import {DiffModes} from '../../constants/diff-modes';
import {getHttpErrorMessage} from './utils';
import {fetchDataFromDatabases, mergeDatabases, connectToDatabase, getMainDatabaseUrl, getSuitesTableRows} from '../../db-utils/client';
import {setFilteredBrowsers} from './query-params';
import plugins from './plugins';
import performanceMarks from '../../constants/performance-marks';

export const createNotification = (id, status, message, props = {}) => {
    const notificationProps = {
        position: POSITIONS.topCenter,
        dismissAfter: 5000,
        dismissible: true,
        showDismissButton: true,
        allowHTML: true,
        ...props
    };

    return notify({id, status, message, ...notificationProps});
};

export const createNotificationError = (id, error, props = {dismissAfter: 0}) =>
    createNotification(id, 'error', getHttpErrorMessage(error), props);

export const dismissNotification = dismissNotify;

export const initGuiReport = () => {
    return async (dispatch) => {
        try {
            const appState = await axios.get('/init');

            const mainDatabaseUrl = getMainDatabaseUrl();
            const db = await connectToDatabase(mainDatabaseUrl.href);

            await plugins.loadAll(appState.data.config);

            dispatch({
                type: actionNames.INIT_GUI_REPORT,
                payload: {...appState.data, db}
            });

            const {customGuiError} = appState.data;

            if (customGuiError) {
                dispatch(createNotificationError('initGuiReport', {...customGuiError}));
                delete appState.data.customGuiError;
            }
        } catch (e) {
            dispatch(createNotificationError('initGuiReport', e));
        }
    };
};

export const initStaticReport = () => {
    return async dispatch => {
        performance?.mark?.(performanceMarks.JS_EXEC);
        const dataFromStaticFile = window.data || {};
        let fetchDbDetails = [];
        let db = null;

        try {
            const mainDatabaseUrls = new URL('databaseUrls.json', window.location.href);
            const fetchDbResponses = await fetchDataFromDatabases([mainDatabaseUrls.href]);

            performance?.mark?.(performanceMarks.DBS_LOADED);

            fetchDbDetails = fetchDbResponses.map(({url, status, data}) => ({url, status, success: !!data}));

            const dataForDbs = fetchDbResponses.map(({data}) => data).filter(data => data);

            db = await mergeDatabases(dataForDbs);

            performance?.mark?.(performanceMarks.DBS_MERGED);
        } catch (e) {
            dispatch(createNotificationError('initStaticReport', e));
        }

        await plugins.loadAll(dataFromStaticFile.config);

        performance?.mark?.(performanceMarks.PLUGINS_LOADED);

        if (!db || isEmpty(fetchDbDetails)) {
            return dispatch({
                type: actionNames.INIT_STATIC_REPORT,
                payload: {...dataFromStaticFile, db, fetchDbDetails, tree: {suites: []}, stats: [], skips: [], browsers: []}
            });
        }

        const testsTreeBuilder = StaticTestsTreeBuilder.create();
        const suitesRows = getSuitesTableRows(db);

        performance?.mark?.(performanceMarks.DB_EXTRACTED_ROWS);

        const {tree, stats, skips, browsers} = testsTreeBuilder.build(suitesRows);

        dispatch({
            type: actionNames.INIT_STATIC_REPORT,
            payload: {...dataFromStaticFile, db, fetchDbDetails, tree, stats, skips, browsers}
        });
    };
};

export const finGuiReport = () => ({type: actionNames.FIN_GUI_REPORT});
export const finStaticReport = () => ({type: actionNames.FIN_STATIC_REPORT});

const runTests = ({tests = [], action = {}} = {}) => {
    return async (dispatch) => {
        try {
            dispatch(action);
            await axios.post('/run', tests);
        } catch (e) {
            console.error('Error while running tests:', e);
        }
    };
};

export const runAllTests = () => {
    return runTests({
        action: {
            type: actionNames.RUN_ALL_TESTS,
            payload: {status: QUEUED}
        }
    });
};

export const runFailedTests = (failedTests, actionName = actionNames.RUN_FAILED_TESTS) => {
    return runTests({tests: failedTests, action: {type: actionName}});
};

export const retrySuite = (tests) => {
    return runTests({tests, action: {type: actionNames.RETRY_SUITE}});
};

export const retryTest = (test) => {
    return runTests({tests: [test], action: {type: actionNames.RETRY_TEST}});
};

export const acceptOpened = (imageIds, type = actionNames.ACCEPT_OPENED_SCREENSHOTS) => {
    return async (dispatch) => {
        dispatch({type: actionNames.PROCESS_BEGIN});

        try {
            const {data} = await axios.post('/reference-data-to-update', imageIds);
            const {data: updatedData} = await axios.post('/update-reference', data);
            dispatch({type, payload: updatedData});

            return updatedData;
        } catch (e) {
            console.error('Error while updating references of failed tests:', e);
            dispatch(createNotificationError('acceptScreenshot', e));

            return null;
        } finally {
            dispatch({type: actionNames.PROCESS_END});
        }
    };
};

export const acceptTest = (imageId) => {
    return acceptOpened([imageId], actionNames.ACCEPT_SCREENSHOT);
};

export const screenshotAccepterAccept = (imageId) => {
    return acceptOpened([imageId], actionNames.SCREENSHOT_ACCEPTER_ACCEPT);
};

export const applyDelayedTestResults = (testResults) => {
    return {type: actionNames.APPLY_DELAYED_TEST_RESULTS, payload: testResults};
};

export const undoAcceptImages = (imageIds, {skipTreeUpdate = false} = {}) => {
    return async (dispatch) => {
        dispatch({type: actionNames.PROCESS_BEGIN});

        try {
            const {data} = await axios.post('/reference-data-to-update', imageIds);
            const {data: updatedData} = await axios.post('/undo-accept-images', data);
            const payload = {...updatedData, skipTreeUpdate};

            dispatch({type: actionNames.UNDO_ACCEPT_IMAGES, payload});
        } catch (e) {
            console.error('Error while reverting reference:', e);
            dispatch(createNotificationError('undoScreenshot', e));
        } finally {
            dispatch({type: actionNames.PROCESS_END});
        }
    };
};

export const undoAcceptImage = (imageId, opts) => undoAcceptImages([imageId], opts);

export const stopTests = () => async dispatch => {
    try {
        await axios.post('/stop');
        dispatch({type: actionNames.STOP_TESTS});
    } catch (e) {
        console.error('Error while stopping tests:', e);
    }
};

export const testsEnd = () => async dispatch => {
    try {
        const mainDatabaseUrl = getMainDatabaseUrl();
        const db = await connectToDatabase(mainDatabaseUrl.href);

        dispatch({
            type: actionNames.TESTS_END,
            payload: {db}
        });
    } catch (e) {
        dispatch(createNotificationError('testsEnd', e));
    }
};

export const suiteBegin = (suite) => ({type: actionNames.SUITE_BEGIN, payload: suite});
export const testBegin = (test) => ({type: actionNames.TEST_BEGIN, payload: test});
export const testResult = (result) => ({type: actionNames.TEST_RESULT, payload: result});
export const toggleStateResult = (result) => ({type: actionNames.TOGGLE_STATE_RESULT, payload: result});
export const changeTestRetry = (result) => ({type: actionNames.CHANGE_TEST_RETRY, payload: result});
export const toggleLoading = (payload) => ({type: actionNames.TOGGLE_LOADING, payload});
export const closeSections = (payload) => ({type: actionNames.CLOSE_SECTIONS, payload});
export const openModal = (payload) => ({type: actionNames.OPEN_MODAL, payload});
export const closeModal = (payload) => ({type: actionNames.CLOSE_MODAL, payload});
export const runFailed = () => ({type: actionNames.RUN_FAILED_TESTS});
export const expandAll = () => ({type: actionNames.VIEW_EXPAND_ALL});
export const expandErrors = () => ({type: actionNames.VIEW_EXPAND_ERRORS});
export const expandRetries = () => ({type: actionNames.VIEW_EXPAND_RETRIES});
export const collapseAll = () => ({type: actionNames.VIEW_COLLAPSE_ALL});
export const processBegin = () => ({type: actionNames.PROCESS_BEGIN});
export const processEnd = () => ({type: actionNames.PROCESS_END});
export const updateBaseHost = (host) => ({type: actionNames.VIEW_UPDATE_BASE_HOST, host});
export const copySuiteName = (payload) => ({type: actionNames.COPY_SUITE_NAME, payload});
export const viewInBrowser = () => ({type: actionNames.VIEW_IN_BROWSER});
export const copyTestLink = () => ({type: actionNames.COPY_TEST_LINK});
export const toggleSuiteSection = (payload) => ({type: actionNames.TOGGLE_SUITE_SECTION, payload});
export const toggleBrowserSection = (payload) => ({type: actionNames.TOGGLE_BROWSER_SECTION, payload});
export const toggleMetaInfo = () => ({type: actionNames.TOGGLE_META_INFO});
export const togglePageScreenshot = () => ({type: actionNames.TOGGLE_PAGE_SCREENSHOT});
export const toggleBrowserCheckbox = (payload) => ({type: actionNames.TOGGLE_BROWSER_CHECKBOX, payload});
export const toggleSuiteCheckbox = (payload) => ({type: actionNames.TOGGLE_SUITE_CHECKBOX, payload});
export const toggleGroupCheckbox = (payload) => ({type: actionNames.TOGGLE_GROUP_CHECKBOX, payload});
export const updateBottomProgressBar = (payload) => ({type: actionNames.UPDATE_BOTTOM_PROGRESS_BAR, payload});
export const toggleTestsGroup = (payload) => ({type: actionNames.TOGGLE_TESTS_GROUP, payload});
export const groupTestsByKey = (payload) => ({type: actionNames.GROUP_TESTS_BY_KEY, payload});
export const changeViewMode = (payload) => ({type: actionNames.CHANGE_VIEW_MODE, payload});

export const runCustomGuiAction = (payload) => {
    return async (dispatch) => {
        try {
            const {sectionName, groupIndex, controlIndex} = payload;

            await axios.post('/run-custom-gui-action', {sectionName, groupIndex, controlIndex});

            dispatch({type: actionNames.RUN_CUSTOM_GUI_ACTION, payload});
        } catch (e) {
            dispatch(createNotificationError('runCustomGuiAction', e));
        }
    };
};

export const updateTestNameFilter = (testNameFilter) => {
    return {type: actionNames.VIEW_UPDATE_FILTER_BY_NAME, testNameFilter};
};

export const setStrictMatchFilter = (strictMatchFilter) => {
    return {type: actionNames.VIEW_SET_STRICT_MATCH_FILTER, strictMatchFilter};
};

export function changeDiffMode(mode) {
    switch (mode) {
        case DiffModes.ONLY_DIFF.id:
            return {type: actionNames.VIEW_ONLY_DIFF};

        case DiffModes.SWITCH.id:
            return {type: actionNames.VIEW_SWITCH_DIFF};

        case DiffModes.SWIPE.id:
            return {type: actionNames.VIEW_SWIPE_DIFF};

        case DiffModes.ONION_SKIN.id:
            return {type: actionNames.VIEW_ONION_SKIN_DIFF};

        case DiffModes.THREE_UP_SCALED.id:
            return {type: actionNames.VIEW_THREE_UP_SCALED_DIFF};

        case DiffModes.THREE_UP_SCALED_TO_FIT.id:
            return {type: actionNames.VIEW_THREE_UP_SCALED_TO_FIT_DIFF};

        case DiffModes.THREE_UP.id:
        default:
            return {type: actionNames.VIEW_THREE_UP_DIFF};
    }
}

export const findSameDiffs = (selectedImageId, openedImageIds, browserName) => {
    return async (dispatch) => {
        dispatch(toggleLoading({active: true, content: 'Find same diffs...'}));

        const comparedImageIds = openedImageIds.filter((id) => id.includes(browserName) && id !== selectedImageId);
        let equalImagesIds = [];

        try {
            if (!isEmpty(comparedImageIds)) {
                const {data} = await axios.post('/get-find-equal-diffs-data', [selectedImageId].concat(comparedImageIds));

                if (!isEmpty(data)) {
                    equalImagesIds = (await axios.post('/find-equal-diffs', data)).data;
                }
            }

            const closeImagesIds = difference(openedImageIds, [].concat(selectedImageId, equalImagesIds));

            if (!isEmpty(closeImagesIds)) {
                dispatch(closeSections(closeImagesIds));
            }
        } catch (e) {
            console.error('Error while trying to find equal diffs:', e);
        } finally {
            dispatch(toggleLoading({active: false}));
            dispatch(openModal({
                id: modalTypes.FIND_SAME_DIFFS,
                type: modalTypes.FIND_SAME_DIFFS,
                data: {
                    browserId: browserName,
                    equalImages: equalImagesIds.length,
                    comparedImages: comparedImageIds.length
                }
            }));
        }
    };
};

export const selectBrowsers = (browsers) => {
    setFilteredBrowsers(browsers);

    return {
        type: actionNames.BROWSERS_SELECTED,
        payload: {browsers}
    };
};
