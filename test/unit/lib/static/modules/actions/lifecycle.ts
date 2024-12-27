import axiosOriginal from 'axios';
import _ from 'lodash';
import proxyquire from 'proxyquire';
import sinon, {SinonStub, SinonStubbedInstance} from 'sinon';

import {LOCAL_DATABASE_NAME, ToolName} from '@/constants';
import actionNames from '@/static/modules/action-names';
import {StaticTestsTreeBuilder} from '@/tests-tree-builder/static';
import type * as actionsModule from '@/static/modules/actions/lifecycle';

const axios = axiosOriginal as unknown as SinonStubbedInstance<typeof axiosOriginal>;

describe('lib/static/modules/actions/lifecycle', () => {
    const sandbox = sinon.createSandbox();
    let actions: typeof actionsModule;
    let dispatch: SinonStub;
    let getMainDatabaseUrl: SinonStub;
    let connectToDatabaseStub: SinonStub;
    let createNotificationError: SinonStub;
    let pluginsStub: {loadAll: SinonStub};

    beforeEach(() => {
        dispatch = sandbox.stub();
        createNotificationError = sandbox.stub();
        getMainDatabaseUrl = sandbox.stub().returns({href: 'http://localhost/default/sqlite.db'});
        connectToDatabaseStub = sandbox.stub().resolves({});
        pluginsStub = {loadAll: sandbox.stub()};

        actions = proxyquire('lib/static/modules/actions/lifecycle', {
            '@/static/modules/actions/notifications': {
                createNotificationError
            },
            '@/db-utils/client': {getMainDatabaseUrl, connectToDatabase: connectToDatabaseStub},
            '@/static/modules/plugins': pluginsStub
        });
    });

    afterEach(() => sandbox.restore());

    describe('thunkInitGuiReport', () => {
        beforeEach(() => {
            sandbox.stub(axios, 'get').resolves({data: {}});
        });

        it('should run init action on server', async () => {
            await actions.thunkInitGuiReport()(dispatch, sinon.stub(), sinon.stub());

            assert.calledOnceWith(axios.get, '/init');
        });

        it('should fetch database from default html page', async () => {
            const href = 'http://127.0.0.1:8080/sqlite.db';
            getMainDatabaseUrl.returns({href});

            await actions.thunkInitGuiReport()(dispatch, sinon.stub(), sinon.stub());

            assert.calledOnceWith(connectToDatabaseStub, `http://127.0.0.1:8080/${LOCAL_DATABASE_NAME}`);
        });

        it('should dispatch "INIT_GUI_REPORT" action with data from "/init" route and connection to db', async () => {
            const db = {};
            connectToDatabaseStub.resolves(db);
            axios.get.resolves({data: {some: 'data'}});

            await actions.thunkInitGuiReport()(dispatch, sinon.stub(), sinon.stub());

            assert.calledOnceWith(dispatch, {
                type: actionNames.INIT_GUI_REPORT,
                payload: {some: 'data', isNewUi: undefined, db}
            });
        });

        it('should show notification if error in initialization on the server is happened', async () => {
            const customGuiError = new Error('failed to initialize custom gui');
            axios.get.rejects(customGuiError);

            await actions.thunkInitGuiReport()(dispatch, sinon.stub(), sinon.stub());

            assert.calledOnceWith(createNotificationError, 'initGuiReport', customGuiError);
        });

        it('should init plugins with the config from /init route', async () => {
            const config = {pluginsEnabled: true, plugins: []};
            axios.get.withArgs('/init').resolves({data: {config}});

            await actions.thunkInitGuiReport()(dispatch, sinon.stub(), sinon.stub());

            assert.calledOnceWith(pluginsStub.loadAll, config);
        });
    });

    describe('thunkInitStaticReport', () => {
        let fetchDataFromDatabasesStub: SinonStub;
        let mergeDatabasesStub: SinonStub;
        let originalWindow: Window;
        let getSuitesTableRows: SinonStub;
        let staticTestsTreeBuilder: SinonStubbedInstance<StaticTestsTreeBuilder>;

        beforeEach(() => {
            fetchDataFromDatabasesStub = sandbox.stub().resolves();
            mergeDatabasesStub = sandbox.stub().resolves();
            getSuitesTableRows = sandbox.stub();
            staticTestsTreeBuilder = sinon.createStubInstance(StaticTestsTreeBuilder);

            staticTestsTreeBuilder.build.returns({});

            originalWindow = global.window;
            _.set(global, 'window', {
                data: {
                    apiValues: {toolName: ToolName.Testplane}
                },
                location: {
                    href: 'http://localhost/random/path.html'
                }
            });

            actions = proxyquire('lib/static/modules/actions/lifecycle', {
                '@/db-utils/client': {
                    fetchDataFromDatabases: fetchDataFromDatabasesStub,
                    mergeDatabases: mergeDatabasesStub,
                    getSuitesTableRows
                },
                '@/tests-tree-builder/static': {
                    StaticTestsTreeBuilder: {
                        create: () => staticTestsTreeBuilder
                    }
                },
                '@/static/modules/plugins': pluginsStub
            });
        });

        afterEach(() => {
            _.set(global, 'window', originalWindow);
        });

        it('should fetch databaseUrls.json for default html page', async () => {
            global.window.location.href = 'http://127.0.0.1:8080/';

            await actions.thunkInitStaticReport()(dispatch, sinon.stub(), sinon.stub());

            assert.calledOnceWith(fetchDataFromDatabasesStub, ['http://127.0.0.1:8080/databaseUrls.json']);
        });

        it('should fetch databaseUrls.json for custom html page', async () => {
            global.window.location.href = 'http://127.0.0.1:8080/some/path.html';

            await actions.thunkInitStaticReport()(dispatch, sinon.stub(), sinon.stub());

            assert.calledOnceWith(fetchDataFromDatabasesStub, ['http://127.0.0.1:8080/some/databaseUrls.json']);
        });

        it('should dispatch empty payload if fetchDatabases rejected', async () => {
            fetchDataFromDatabasesStub.rejects('stub');

            await actions.thunkInitStaticReport()(dispatch, sinon.stub(), sinon.stub());

            assert.calledWith(
                dispatch.lastCall,
                {
                    type: actionNames.INIT_STATIC_REPORT,
                    payload: sinon.match({db: null, fetchDbDetails: []})
                }
            );
        });

        it('should dispatch payload.fetchDbDetails even if "mergeDatabases" rejected', async () => {
            fetchDataFromDatabasesStub.resolves([{url: 'stub url', status: 200, data: 'stub'}]);
            mergeDatabasesStub.rejects('stub');

            await actions.thunkInitStaticReport()(dispatch, sinon.stub(), sinon.stub());

            assert.calledWith(
                dispatch.lastCall,
                {
                    type: actionNames.INIT_STATIC_REPORT,
                    payload: sinon.match({fetchDbDetails: [{url: 'stub url', status: 200, success: true}]})
                }
            );
        });

        it('should filter null data before merge databases', async () => {
            fetchDataFromDatabasesStub.resolves([{url: 'stub url1', status: 404, data: null}, {url: 'stub url2', status: 200, data: 'stub'}]);

            await actions.thunkInitStaticReport()(dispatch, sinon.stub(), sinon.stub());

            assert.calledOnceWith(mergeDatabasesStub, ['stub']);
        });

        it('should build tests tree', async () => {
            const db = {};
            const suitesFromDb = ['rows-with-suites'];
            fetchDataFromDatabasesStub.resolves([{url: 'stub url2', status: 200, data: 'stub'}]);
            // TODO: properly test this case. This PR only fixed default state, which is now correct, but
            //       this test never worked correctly
            const treeBuilderResult = {tree: undefined, stats: {}, skips: [], browsers: []};

            mergeDatabasesStub.resolves(db);
            getSuitesTableRows.withArgs(db).returns(suitesFromDb);
            staticTestsTreeBuilder.build.withArgs(suitesFromDb).returns(treeBuilderResult);

            await actions.thunkInitStaticReport()(dispatch, sinon.stub(), sinon.stub());

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
            _.set(global.window, 'data.config', config);

            await actions.thunkInitStaticReport()(dispatch, sinon.stub(), sinon.stub());

            assert.calledOnceWith(pluginsStub.loadAll, config);
        });
    });
});
