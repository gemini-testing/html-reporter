import * as runTestsActions from '@/static/modules/actions/run-tests';
import actionNames from '@/static/modules/action-names';
import sinon, {SinonStub, SinonStubbedInstance} from 'sinon';
import proxyquire from 'proxyquire';
import axiosOriginal from 'axios';
import guiReducer from '@/static/modules/reducers/gui';
import defaultState from '@/static/modules/default-state';
import type {State} from '@/static/new-ui/types/store';

const axios = axiosOriginal as unknown as SinonStubbedInstance<typeof axiosOriginal>;

describe('lib/static/modules/actions/run-tests', () => {
    const sandbox = sinon.sandbox.create();
    let getMainDatabaseUrl: SinonStub;
    let connectToDatabaseStub: SinonStub;
    let createNotificationErrorStub: SinonStub;
    let dispatch: SinonStub;
    let actions: typeof runTestsActions;

    beforeEach(() => {
        dispatch = sandbox.stub();
        getMainDatabaseUrl = sandbox.stub().returns({href: 'http://localhost/default/sqlite.db'});
        connectToDatabaseStub = sandbox.stub().resolves({});
        createNotificationErrorStub = sandbox.stub();

        sandbox.stub(axios, 'post').resolves({data: {}});

        actions = proxyquire('lib/static/modules/actions/run-tests', {
            '@/db-utils/client': {getMainDatabaseUrl, connectToDatabase: connectToDatabaseStub},
            '@/static/modules/actions/notifications': {createNotificationError: createNotificationErrorStub}
        });
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('queued runs', () => {
        let state: State;

        beforeEach(() => {
            state = {...defaultState, app: {...defaultState.app, isGuiInitializing: true}} as State;
            dispatch.callsFake(action => {
                if (typeof action === 'function') {
                    return action(dispatch, () => state, null);
                }
                if (action) {
                    state = guiReducer(state, action);
                }
                return action;
            });
        });

        it('should snapshot the first selection and repeat count without sending a request', async () => {
            state.repeatCount = 3;
            const tests = [{testName: 'selected', browserName: 'chrome'}];
            await dispatch(actions.thunkRunTests({tests}));
            tests[0].testName = 'changed';
            state.repeatCount = 5;
            await dispatch(actions.thunkRunTests({tests}));
            await dispatch(actions.thunkRunQueuedTests());

            assert.notCalled(axios.post);
            assert.deepEqual(state.app.queuedTestRun, {
                tests: [{testName: 'selected', browserName: 'chrome'}], repeatCount: 3
            });
            assert.isTrue(state.processing);
            assert.isTrue(state.running);
        });

        it('should submit the queued request exactly once after initialization', async () => {
            const tests = [{testName: 'selected', browserName: 'chrome'}];
            await dispatch(actions.thunkRunTests({tests, repeatCount: 3}));
            dispatch({type: actionNames.INIT_GUI_REPORT, payload: {isCached: false}});
            await dispatch(actions.thunkRunQueuedTests());
            await dispatch(actions.thunkRunQueuedTests());

            assert.calledOnceWith(axios.post, '/run', {tests, repeatCount: 3});
            assert.isNull(state.app.queuedTestRun);
        });

        it('should cancel a queued run locally without stopping Testplane initialization', async () => {
            await dispatch(actions.thunkRunAllTests());
            assert.neverCalledWithMatch(dispatch, {type: actionNames.RUN_ALL_TESTS});
            await dispatch(actions.thunkStopTests());
            dispatch({type: actionNames.INIT_GUI_REPORT, payload: {isCached: false}});
            await dispatch(actions.thunkRunQueuedTests());

            assert.notCalled(axios.post);
            assert.isNull(state.app.queuedTestRun);
            assert.isFalse(state.running);
            assert.isFalse(state.processing);
        });

        it('should preserve Run All semantics when draining the queue', async () => {
            await dispatch(actions.thunkRunAllTests());
            dispatch({type: actionNames.INIT_GUI_REPORT, payload: {isCached: false}});
            await dispatch(actions.thunkRunQueuedTests());

            assert.calledOnceWith(axios.post, '/run', {tests: [], repeatCount: 1});
            assert.calledWith(dispatch, {type: actionNames.RUN_ALL_TESTS});
        });

        it('should clear pending state and report a rejected run request', async () => {
            const error = new Error('run failed');
            axios.post.rejects(error);
            await dispatch(actions.thunkRunTests());
            dispatch({type: actionNames.INIT_GUI_REPORT, payload: {isCached: false}});
            await dispatch(actions.thunkRunQueuedTests());

            assert.isNull(state.app.queuedTestRun);
            assert.isFalse(state.running);
            assert.isFalse(state.processing);
            assert.calledWith(createNotificationErrorStub, 'runTests', error);
        });
    });

    describe('thunkRunTest', () => {
        it('should retry passed test', async () => {
            dispatch.callsFake((action) => {
                if (typeof action === 'function') {
                    return action(dispatch, () => ({repeatCount: 1}), null);
                }
                return action;
            });
            const test = {testName: 'test-name', browserName: 'yabro'};

            await actions.thunkRunTest({test})(dispatch, sinon.stub(), null);

            assert.calledOnceWith(axios.post, '/run', {tests: [test], repeatCount: 1});
            assert.calledWith(dispatch, {type: actionNames.RETRY_TEST});
        });
    });

    describe('thunkRunFailedTests', () => {
        it('should run all failed tests', async () => {
            dispatch.callsFake((action) => {
                if (typeof action === 'function') {
                    return action(dispatch, () => ({repeatCount: 1}), null);
                }
                return action;
            });
            const failedTests = [
                {testName: 'test-name-1', browserName: 'yabro'},
                {testName: 'test-name-2', browserName: 'yabro'}
            ];

            await actions.thunkRunFailedTests({tests: failedTests})(dispatch, sinon.stub(), null);

            assert.calledOnceWith(axios.post, '/run', {tests: failedTests, repeatCount: 1});
            assert.calledWith(dispatch, {type: actionNames.RUN_FAILED_TESTS});
        });
    });

    describe('testsEnd', () => {
        it('should connect to database', async () => {
            const href = 'http://127.0.0.1:8080/sqlite.db';
            getMainDatabaseUrl.returns({href});

            await actions.thunkTestsEnd()(dispatch, sinon.stub(), null);

            assert.calledOnceWith(connectToDatabaseStub, href);
        });

        it('should dispatch "TESTS_END" action with db connection', async () => {
            const db = {};
            connectToDatabaseStub.resolves(db);

            await actions.thunkTestsEnd()(dispatch, sinon.stub(), null);

            assert.calledOnceWith(dispatch, {
                type: actionNames.TESTS_END,
                payload: {db}
            });
        });

        it('should show notification if error appears', async () => {
            const dbConnectError = new Error('failed to connect to database');
            connectToDatabaseStub.rejects(dbConnectError);

            await actions.thunkTestsEnd()(dispatch, sinon.stub(), null);

            assert.calledOnceWith(
                createNotificationErrorStub,
                'testsEnd',
                dbConnectError
            );
        });
    });
});
