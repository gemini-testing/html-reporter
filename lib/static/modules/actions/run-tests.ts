import axios from 'axios';

import type {Database} from '@gemini-testing/sql.js';
import actionNames from '@/static/modules/action-names';
import {Action, AppThunk} from '@/static/modules/actions/types';
import {TestSpec} from '@/adapters/tool/types';
import {connectToDatabase, getMainDatabaseUrl} from '@/db-utils/client';
import {createNotificationError} from '@/static/modules/actions/notifications';
import {TestBranch} from '@/tests-tree-builder/gui';
import {TestStatus} from '@/constants';

export type RunTestAction = Action<typeof actionNames.RETRY_TEST>;
export const runTest = (): RunTestAction => ({type: actionNames.RETRY_TEST});

export const thunkRunTests = ({tests = []}: {tests?: TestSpec[]} = {}): AppThunk => {
    return async (dispatch) => {
        dispatch(runTest());
        try {
            await axios.post('/run', tests);
        } catch (e) {
            // TODO: report error via notifications
            console.error('Error while running tests:', e);
        }
    };
};

export type RunAllTestsAction = Action<typeof actionNames.RUN_ALL_TESTS>;
export const runAllTests = (): RunAllTestsAction => ({type: actionNames.RUN_ALL_TESTS});

export const thunkRunAllTests = (): AppThunk => {
    return async (dispatch) => {
        dispatch(runAllTests());
        await dispatch(thunkRunTests());
    };
};

export type RunFailedTestsAction = Action<typeof actionNames.RUN_FAILED_TESTS>;
export const runFailedTests = (): RunFailedTestsAction => ({type: actionNames.RUN_FAILED_TESTS});

export const thunkRunFailedTests = ({tests}: {tests: TestSpec[]}): AppThunk => {
    return async (dispatch) => {
        dispatch(runFailedTests());
        await dispatch(thunkRunTests({tests}));
    };
};

export type RunSuiteAction = Action<typeof actionNames.RETRY_SUITE>;
export const runSuite = (): RunSuiteAction => ({type: actionNames.RETRY_SUITE});

export const thunkRunSuite = ({tests}: {tests: TestSpec[]}): AppThunk => {
    return async (dispatch) => {
        dispatch(runSuite());
        await dispatch(thunkRunTests({tests}));
    };
};

export const thunkRunTest = ({test}: {test: TestSpec}): AppThunk => {
    return async (dispatch) => {
        dispatch(runTest());
        await dispatch(thunkRunTests({tests: [test]}));
    };
};

export type StopTestsAction = Action<typeof actionNames.STOP_TESTS>;
export const stopTests = (): StopTestsAction => ({type: actionNames.STOP_TESTS});

export const thunkStopTests = (): AppThunk => {
    return async (dispatch) => {
        try {
            await axios.post('/stop');
            dispatch(stopTests());
        } catch (e) {
            // TODO: report error via notifications
            console.error('Error while stopping tests:', e);
        }
    };
};

export type TestsEndAction = Action<typeof actionNames.TESTS_END, {
    db: Database;
}>;
export const testsEnd = (payload: TestsEndAction['payload']): TestsEndAction => ({type: actionNames.TESTS_END, payload});

export const thunkTestsEnd = (): AppThunk => {
    return async (dispatch) => {
        try {
            const mainDatabaseUrl = getMainDatabaseUrl();
            const db = await connectToDatabase(mainDatabaseUrl.href);

            dispatch(testsEnd({db}));
        } catch (e: unknown) {
            dispatch(createNotificationError('testsEnd', e as Error));
        }
    };
};

export type SuiteBeginAction = Action<typeof actionNames.SUITE_BEGIN, {
    suiteId: string;
    status: TestStatus.RUNNING;
}>;
export const suiteBegin = (payload: SuiteBeginAction['payload']): SuiteBeginAction => ({type: actionNames.SUITE_BEGIN, payload});

export type TestBeginAction = Action<typeof actionNames.TEST_BEGIN, TestBranch>;
export const testBegin = (payload: TestBeginAction['payload']): TestBeginAction => ({type: actionNames.TEST_BEGIN, payload});

export type TestResultAction = Action<typeof actionNames.TEST_RESULT, TestBranch>;
export const testResult = (payload: TestResultAction['payload']): TestResultAction => ({type: actionNames.TEST_RESULT, payload});

export type RunTestsAction =
    | RunAllTestsAction
    | RunFailedTestsAction
    | RunSuiteAction
    | RunTestAction
    | StopTestsAction
    | TestsEndAction
    | SuiteBeginAction
    | TestBeginAction
    | TestResultAction;
