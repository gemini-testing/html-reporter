'use strict';

const _ = require('lodash');
const proxyquire = require('proxyquire');
const {App} = require('lib/gui/app');
const {GuiTreeCache} = require('lib/gui/tree-cache');
const {stubToolAdapter} = require('../../utils');

describe('lib/gui/server', () => {
    const sandbox = sinon.createSandbox();
    let server;
    let expressStub;
    let bodyParserStub;
    let staticMiddleware;
    let initPluginRoutesStub;
    let RouterStub;
    let onExitCallback;
    let appData;

    const mkExpressApp_ = () => ({
        use: sandbox.stub(),
        get: sandbox.stub(),
        set: sandbox.stub(),
        post: sandbox.stub(),
        listen: sandbox.stub().callsArg(2),
        static: sandbox.stub()
    });

    const startServer = (opts = {}) => {
        opts = _.defaults(opts, {
            paths: [],
            toolAdapter: stubToolAdapter(),
            cli: {
                options: {hostname: 'localhost', port: '4444'}
            }
        });

        return server.start(opts);
    };

    const startServerAndWait = async (opts = {}) => {
        const result = await startServer(opts);
        await result.ready;

        return result;
    };

    beforeEach(() => {
        sandbox.stub(GuiTreeCache.prototype, 'read').resolves(null);
        sandbox.stub(GuiTreeCache.prototype, 'write').resolves();
        sandbox.stub(App, 'create').returns(Object.create(App.prototype));
        appData = null;
        sandbox.stub(App.prototype, 'data').get(() => appData);
        sandbox.stub(App.prototype, 'initialize').resolves();
        sandbox.stub(App.prototype, 'findEqualDiffs').resolves();
        sandbox.stub(App.prototype, 'finalize');

        expressStub = mkExpressApp_();
        staticMiddleware = sandbox.stub();
        RouterStub = sandbox.stub();
        bodyParserStub = {json: sandbox.stub()};
        initPluginRoutesStub = sandbox.stub();
        onExitCallback = undefined;

        server = proxyquire('lib/gui/server', {
            express: Object.assign(() => expressStub, {
                static: staticMiddleware,
                Router: () => RouterStub
            }),
            'body-parser': bodyParserStub,
            'signal-exit': {onExit: sandbox.stub().callsFake(callback => {
                onExitCallback = callback;
            })},
            '../common-utils': {logger: {log: sandbox.stub()}},
            './routes/plugins': {initPluginsRoutes: initPluginRoutesStub}
        });
    });

    afterEach(() => {
        sandbox.restore();
    });

    it('should init server from api', async () => {
        const toolAdapter = stubToolAdapter();
        const {guiApi} = toolAdapter;

        await startServerAndWait({toolAdapter});

        assert.calledOnceWith(guiApi.initServer, expressStub);
        assert.calledOnceWith(guiApi.serverListening, {url: 'http://localhost:4444'});
        assert.calledOnceWith(guiApi.serverReady, {url: 'http://localhost:4444'});
    });

    it('should init server only after body is parsed', async () => {
        const toolAdapter = stubToolAdapter();
        const {guiApi} = toolAdapter;

        await startServerAndWait({toolAdapter});

        assert.callOrder(bodyParserStub.json, guiApi.initServer, guiApi.serverListening, guiApi.serverReady);
    });

    it('should init server before any static middleware starts', async () => {
        const toolAdapter = stubToolAdapter();
        const {guiApi} = toolAdapter;

        await startServerAndWait({toolAdapter});

        assert.callOrder(guiApi.initServer, staticMiddleware, guiApi.serverListening, guiApi.serverReady);
    });

    it('should start listening before app initialization is completed', async () => {
        let completeInitialization;
        App.prototype.initialize.callsFake(() => new Promise(resolve => {
            completeInitialization = resolve;
        }));
        const toolAdapter = stubToolAdapter();
        const {guiApi} = toolAdapter;

        const result = await startServer({toolAdapter});

        assert.calledOnce(guiApi.serverListening);
        assert.notCalled(guiApi.serverReady);

        await new Promise(resolve => setImmediate(resolve));
        completeInitialization();
        await result.ready;

        assert.calledOnce(guiApi.serverReady);
    });

    it('should properly complete app working', async () => {
        sandbox.stub(process, 'kill');
        sandbox.stub(process, 'exit');

        const result = await startServer();
        await result.ready;

        onExitCallback();
        await new Promise(resolve => setImmediate(resolve));

        assert.calledOnce(App.prototype.finalize);
    });

    it('should serve the cache before discovery completes and the fresh tree afterwards', async () => {
        let finish;
        App.prototype.initialize.callsFake(() => new Promise(resolve => {
            finish = resolve;
        }));
        const snapshot = {tree: {suites: {allIds: ['cached']}}, skips: [], timestamp: 1, date: 'date'};
        GuiTreeCache.prototype.read.resolves(snapshot);
        const toolAdapter = stubToolAdapter();
        toolAdapter.initGuiHandler = sandbox.stub().resolves();
        const result = await startServer({toolAdapter});
        const init = expressStub.get.withArgs('/init').firstCall.args[1];
        const res = {json: sandbox.stub(), status: sandbox.stub().returnsThis()};

        await init({query: {cached: '1'}}, res);
        assert.calledWithMatch(res.json, {tree: snapshot.tree, isCached: true, autoRun: false});
        assert.notCalled(res.status);
        assert.notCalled(toolAdapter.initGuiHandler);

        const guard = expressStub.use.getCalls().map(call => call.args[0]).find(fn => fn?.constructor.name === 'AsyncFunction');
        const next = sandbox.stub();
        await guard({}, res, next);
        assert.calledWith(res.status, 503);
        assert.notCalled(next);

        res.json.resetHistory();
        const request = init({query: {}}, res);
        await new Promise(resolve => setImmediate(resolve));
        assert.notCalled(res.json);
        const fresh = {tree: {suites: {allIds: ['fresh']}}};
        appData = fresh;
        finish();
        await result.ready;
        await request;
        assert.calledWith(res.json, fresh);
        assert.calledWith(GuiTreeCache.prototype.write, fresh);
        await guard({}, res, next);
        assert.calledOnce(next);
    });

    it('should return discovery errors without overwriting the cache', async () => {
        App.prototype.initialize.rejects(new Error('read failed'));
        const result = await startServer();
        await assert.isRejected(result.ready, 'read failed');
        const init = expressStub.get.withArgs('/init').firstCall.args[1];
        const res = {json: sandbox.stub(), status: sandbox.stub().returnsThis()};
        await init({query: {}}, res);
        assert.calledWith(res.status, 500);
        assert.notCalled(GuiTreeCache.prototype.write);
    });

    it('should wait for the fresh tree when autoRun is enabled even if a cache exists', async () => {
        let finish;
        App.prototype.initialize.callsFake(() => new Promise(resolve => {
            finish = resolve;
        }));
        GuiTreeCache.prototype.read.resolves({tree: {suites: {allIds: ['cached']}}});
        const result = await startServer({cli: {options: {autoRun: true, port: '4444', hostname: 'localhost'}}});
        const init = expressStub.get.withArgs('/init').firstCall.args[1];
        const res = {json: sandbox.stub(), status: sandbox.stub().returnsThis()};
        const request = init({query: {cached: '1'}}, res);
        await new Promise(resolve => setImmediate(resolve));
        assert.notCalled(res.json);
        finish();
        await result.ready;
        await request;
        assert.neverCalledWithMatch(res.json, {isCached: true});
    });

    it('should correctly set json replacer', async () => {
        const toolAdapter = stubToolAdapter();

        await startServer({toolAdapter});

        assert.calledOnceWith(expressStub.set, 'json replacer', sinon.match.func);
    });

    it('should try to attach plugins middleware on startup', async () => {
        const reporterConfig = {
            path: 'test-path',
            plugins: [
                {name: 'test-plugin', component: 'TestComponent'}
            ]
        };
        const toolAdapter = stubToolAdapter({reporterConfig});

        await startServer({toolAdapter});

        assert.calledOnceWith(initPluginRoutesStub, RouterStub, reporterConfig);
    });
});
