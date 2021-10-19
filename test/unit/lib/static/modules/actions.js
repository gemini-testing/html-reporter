import axios from 'axios';
import proxyquire from 'proxyquire';
import {acceptOpened, retryTest, runFailedTests} from 'lib/static/modules/actions';
import actionNames from 'lib/static/modules/action-names';
import StaticTestsTreeBuilder from 'lib/tests-tree-builder/static';
import {LOCAL_DATABASE_NAME} from 'lib/constants/file-names';

describe('lib/static/modules/actions', () => {
    const sandbox = sinon.sandbox.create();
    let dispatch, actions, addNotification, getSuitesTableRows, connectToDatabaseStub, pluginsStub;

    beforeEach(() => {
        dispatch = sandbox.stub();
        sandbox.stub(axios, 'post').resolves({data: {}});
        addNotification = sandbox.stub();
        getSuitesTableRows = sandbox.stub();
        connectToDatabaseStub = sandbox.stub().resolves({});
        pluginsStub = {loadAll: sandbox.stub()};

        sandbox.stub(StaticTestsTreeBuilder, 'create').returns(Object.create(StaticTestsTreeBuilder.prototype));
        sandbox.stub(StaticTestsTreeBuilder.prototype, 'build').returns({});

        actions = proxyquire('lib/static/modules/actions', {
            'reapop': {addNotification},
            './database-utils': {getSuitesTableRows},
            './sqlite': {connectToDatabase: connectToDatabaseStub},
            './plugins': pluginsStub
        });
    });

    afterEach(() => sandbox.restore());

    describe('initGuiReport', () => {
        beforeEach(() => {
            sandbox.stub(axios, 'get').resolves({data: {}});

            global.window = {
                location: {
                    href: 'http://localhost/random/path.html'
                }
            };
        });

        afterEach(() => {
            global.window = undefined;
        });

        it('should run init action on server', async () => {
            await actions.initGuiReport()(dispatch);

            assert.calledOnceWith(axios.get, '/init');
        });

        it('should fetch database from default html page', async () => {
            global.window.location.href = 'http://127.0.0.1:8080/';

            await actions.initGuiReport()(dispatch);

            assert.calledOnceWith(connectToDatabaseStub, `http://127.0.0.1:8080/${LOCAL_DATABASE_NAME}`);
        });

        it('should dispatch "INIT_GUI_REPORT" action with data from "/init" route and connection to db', async () => {
            const db = {};
            connectToDatabaseStub.resolves(db);
            axios.get.resolves({data: {some: 'data'}});

            await actions.initGuiReport()(dispatch);

            assert.calledOnceWith(dispatch, {
                type: actionNames.INIT_GUI_REPORT,
                payload: {some: 'data', db}
            });
        });

        it('should show notification if error in initialization on the server is happened', async () => {
            axios.get.rejects(new Error('failed to initialize custom gui'));

            await actions.initGuiReport()(dispatch);

            assert.calledOnceWith(
                addNotification,
                {
                    dismissAfter: 0,
                    id: 'initGuiReport',
                    message: 'failed to initialize custom gui',
                    status: 'error'
                }
            );
        });

        it('should init plugins with the config from /init route', async () => {
            const config = {pluginsEnabled: true, plugins: []};
            axios.get.withArgs('/init').resolves({data: {config}});

            await actions.initGuiReport()(dispatch);

            assert.calledOnceWith(pluginsStub.loadAll, config);
        });
    });

    describe('acceptOpened', () => {
        it('should update opened images', async () => {
            const imageIds = ['img-id-1', 'img-id-2'];
            const images = [{id: 'img-id-1'}, {id: 'img-id-2'}];
            axios.post.withArgs('/get-update-reference-data', imageIds).returns({data: images});

            await acceptOpened(imageIds)(dispatch);

            assert.calledWith(axios.post.firstCall, '/get-update-reference-data', imageIds);
            assert.calledWith(axios.post.secondCall, '/update-reference', images);
        });
    });

    describe('retryTest', () => {
        it('should retry passed test', async () => {
            const test = {testName: 'test-name', browserName: 'yabro'};

            await retryTest(test)(dispatch);

            assert.calledOnceWith(axios.post, '/run', [test]);
            assert.calledOnceWith(dispatch, {type: actionNames.RETRY_TEST});
        });
    });

    describe('runFailedTests', () => {
        it('should run all failed tests', async () => {
            const failedTests = [
                {testName: 'test-name-1', browserName: 'yabro'},
                {testName: 'test-name-2', browserName: 'yabro'}
            ];

            await runFailedTests(failedTests)(dispatch);

            assert.calledOnceWith(axios.post, '/run', failedTests);
            assert.calledOnceWith(dispatch, {type: actionNames.RUN_FAILED_TESTS});
        });
    });

    describe('initStaticReport', () => {
        let fetchDatabasesStub;
        let mergeDatabasesStub;
        let actions;

        beforeEach(() => {
            fetchDatabasesStub = sandbox.stub().resolves();
            mergeDatabasesStub = sandbox.stub().resolves();

            global.window = {
                location: {
                    href: 'http://localhost/random/path.html'
                }
            };

            actions = proxyquire('lib/static/modules/actions', {
                './sqlite': {
                    fetchDatabases: fetchDatabasesStub,
                    mergeDatabases: mergeDatabasesStub
                },
                './plugins': pluginsStub
            });
        });

        afterEach(() => {
            sandbox.restore();

            global.window = undefined;
        });

        it('should fetch databaseUrls.json for default html page', async () => {
            global.window.location.href = 'http://127.0.0.1:8080/';

            await actions.initStaticReport()(dispatch);

            assert.calledOnceWith(fetchDatabasesStub, ['http://127.0.0.1:8080/databaseUrls.json']);
        });

        it('should fetch databaseUrls.json for custom html page', async () => {
            global.window.location.href = 'http://127.0.0.1:8080/some/path.html';

            await actions.initStaticReport()(dispatch);

            assert.calledOnceWith(fetchDatabasesStub, ['http://127.0.0.1:8080/some/databaseUrls.json']);
        });

        it('should dispatch empty payload if fetchDatabases rejected', async () => {
            fetchDatabasesStub.rejects('stub');

            await actions.initStaticReport()(dispatch);

            assert.calledWith(
                dispatch.lastCall,
                {
                    type: actionNames.INIT_STATIC_REPORT,
                    payload: sinon.match({db: null, fetchDbDetails: []})
                }
            );
        });

        it('should dispatch payload.fetchDbDetails even if "mergeDatabases" rejected', async () => {
            fetchDatabasesStub.resolves([{url: 'stub url', status: 200, data: 'stub'}]);
            mergeDatabasesStub.rejects('stub');

            await actions.initStaticReport()(dispatch);

            assert.calledWith(
                dispatch.lastCall,
                {
                    type: actionNames.INIT_STATIC_REPORT,
                    payload: sinon.match({fetchDbDetails: [{url: 'stub url', status: 200, success: true}]})
                }
            );
        });

        it('should filter null data before merge databases', async () => {
            fetchDatabasesStub.resolves([{url: 'stub url1', status: 404, data: null}, {url: 'stub url2', status: 200, data: 'stub'}]);

            await actions.initStaticReport()(dispatch);

            assert.calledOnceWith(mergeDatabasesStub, ['stub']);
        });

        it('should build tests tree', async () => {
            const db = {};
            const suitesFromDb = ['rows-with-suites'];
            const treeBuilderResult = {tree: {}, stats: {}, skips: {}, browsers: {}};

            mergeDatabasesStub.resolves(db);
            getSuitesTableRows.withArgs(db).returns(suitesFromDb);
            StaticTestsTreeBuilder.prototype.build.withArgs(suitesFromDb).returns(treeBuilderResult);

            await actions.initStaticReport()(dispatch);

            assert.calledWith(
                dispatch.lastCall,
                {
                    type: actionNames.INIT_STATIC_REPORT,
                    payload: sinon.match({...treeBuilderResult})
                }
            );
        });

        it('should init plugins with the config from data.js', async () => {
            const config = {pluginsEnabled: true, plugins: []};
            global.window.data = {config};

            await actions.initStaticReport()(dispatch);

            assert.calledOnceWith(pluginsStub.loadAll, config);
        });
    });

    describe('runCustomGuiAction', () => {
        it('should run custom action on server for control of given group of section', async () => {
            const payload = {
                sectionName: 'foo',
                groupIndex: 100,
                controlIndex: 500
            };

            await actions.runCustomGuiAction(payload)(dispatch);

            assert.calledOnceWith(
                axios.post,
                sinon.match.any,
                sinon.match(({sectionName, groupIndex, controlIndex}) => {
                    assert.equal(sectionName, 'foo');
                    assert.equal(groupIndex, 100);
                    assert.equal(controlIndex, 500);
                    return true;
                })
            );
        });

        it('should dispatch action for control of given group of section', async () => {
            const payload = {
                sectionName: 'foo',
                groupIndex: 100,
                controlIndex: 500
            };

            await actions.runCustomGuiAction(payload)(dispatch);

            assert.calledOnceWith(
                dispatch,
                {
                    type: actionNames.RUN_CUSTOM_GUI_ACTION,
                    payload: {
                        sectionName: 'foo',
                        groupIndex: 100,
                        controlIndex: 500
                    }
                }
            );
        });

        it('should show notification if error in action on the server is happened', async () => {
            const payload = {
                sectionName: 'foo',
                groupIndex: 100,
                controlIndex: 500
            };
            axios.post.throws(new Error('failed to run custom gui control action'));

            await actions.runCustomGuiAction(payload)(dispatch);

            assert.calledOnceWith(
                addNotification,
                {
                    dismissAfter: 0,
                    id: 'runCustomGuiAction',
                    message: 'failed to run custom gui control action',
                    status: 'error'
                }
            );
        });
    });

    describe('openModal', () => {
        it('should open modal', () => {
            const modal = {id: 'modal-id'};

            assert.deepEqual(actions.openModal(modal), {type: actionNames.OPEN_MODAL, payload: modal});
        });
    });

    describe('closeModal', () => {
        it('should close modal', () => {
            const modal = {id: 'modal-id'};

            assert.deepEqual(actions.closeModal(modal), {type: actionNames.CLOSE_MODAL, payload: modal});
        });
    });
});
