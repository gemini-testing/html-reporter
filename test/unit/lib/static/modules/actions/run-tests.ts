import * as runTestsActions from '@/static/modules/actions/run-tests';
import actionNames from '@/static/modules/action-names';
import sinon, {SinonStub, SinonStubbedInstance} from 'sinon';
import proxyquire from 'proxyquire';
import axiosOriginal from 'axios';

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

    describe('thunkRunTest', () => {
        it('should retry passed test', async () => {
            dispatch.callsFake((action) => {
                if (typeof action === 'function') {
                    return action(dispatch, sinon.stub(), null);
                }
                return action;
            });
            const test = {testName: 'test-name', browserName: 'yabro'};

            await actions.thunkRunTest({test})(dispatch, sinon.stub(), null);

            assert.calledOnceWith(axios.post, '/run', [test]);
            assert.calledWith(dispatch, {type: actionNames.RETRY_TEST});
        });
    });

    describe('thunkRunFailedTests', () => {
        it('should run all failed tests', async () => {
            dispatch.callsFake((action) => {
                if (typeof action === 'function') {
                    return action(dispatch, sinon.stub(), null);
                }
                return action;
            });
            const failedTests = [
                {testName: 'test-name-1', browserName: 'yabro'},
                {testName: 'test-name-2', browserName: 'yabro'}
            ];

            await actions.thunkRunFailedTests({tests: failedTests})(dispatch, sinon.stub(), null);

            assert.calledOnceWith(axios.post, '/run', failedTests);
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
