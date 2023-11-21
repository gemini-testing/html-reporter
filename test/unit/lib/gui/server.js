'use strict';

const _ = require('lodash');
const proxyquire = require('proxyquire');
const {App} = require('lib/gui/app');
const {stubTool} = require('../../utils');

describe('lib/gui/server', () => {
    const sandbox = sinon.createSandbox();
    let server;
    let expressStub;
    let bodyParserStub;
    let staticMiddleware;
    let initPluginRoutesStub;
    let RouterStub;

    const mkExpressApp_ = () => ({
        use: sandbox.stub(),
        get: sandbox.stub(),
        set: sandbox.stub(),
        post: sandbox.stub(),
        listen: sandbox.stub().callsArg(2),
        static: sandbox.stub()
    });

    const mkApi_ = () => ({
        initServer: sandbox.stub(),
        serverReady: sandbox.stub()
    });

    const startServer = (opts = {}) => {
        opts = _.defaults(opts, {
            paths: [],
            tool: stubTool(),
            guiApi: mkApi_(),
            configs: {
                options: {hostname: 'localhost', port: '4444'},
                pluginConfig: {path: 'default-path'}
            }
        });

        return server.start(opts);
    };

    beforeEach(() => {
        sandbox.stub(App, 'create').returns(Object.create(App.prototype));
        sandbox.stub(App.prototype, 'initialize').resolves();
        sandbox.stub(App.prototype, 'findEqualDiffs').resolves();
        sandbox.stub(App.prototype, 'finalize');

        expressStub = mkExpressApp_();
        staticMiddleware = sandbox.stub();
        RouterStub = sandbox.stub();
        bodyParserStub = {json: sandbox.stub()};
        initPluginRoutesStub = sandbox.stub();

        server = proxyquire('lib/gui/server', {
            express: Object.assign(() => expressStub, {
                static: staticMiddleware,
                Router: () => RouterStub
            }),
            'body-parser': bodyParserStub,
            'signal-exit': {onExit: sandbox.stub().yields()},
            '../common-utils': {logger: {log: sandbox.stub()}},
            './routes/plugins': {initPluginsRoutes: initPluginRoutesStub}
        });
    });

    afterEach(() => {
        sandbox.restore();
    });

    it('should init server from api', async () => {
        const guiApi = mkApi_();

        await startServer({guiApi});

        assert.calledOnceWith(guiApi.initServer, expressStub);
        assert.calledOnceWith(guiApi.serverReady, {url: 'http://localhost:4444'});
    });

    it('should init server only after body is parsed', async () => {
        const guiApi = mkApi_();

        await startServer({guiApi});

        assert.callOrder(bodyParserStub.json, guiApi.initServer, guiApi.serverReady);
    });

    it('should init server before any static middleware starts', async () => {
        const guiApi = mkApi_();

        await startServer({guiApi});

        assert.callOrder(guiApi.initServer, staticMiddleware, guiApi.serverReady);
    });

    it('should properly complete app working', async () => {
        sandbox.stub(process, 'kill');

        await startServer();

        process.emit('SIGTERM');

        assert.calledOnce(App.prototype.finalize);
    });

    it('should correctly set json replacer', async () => {
        const guiApi = mkApi_();

        await startServer({guiApi});

        assert.calledOnceWith(expressStub.set, 'json replacer', sinon.match.func);
    });

    it('should try to attach plugins middleware on startup', async () => {
        const pluginConfig = {
            path: 'test-path',
            plugins: [
                {name: 'test-plugin', component: 'TestComponent'}
            ]
        };

        await startServer({
            configs: {
                options: {hostname: 'localhost', port: '4444'},
                pluginConfig
            }
        });

        assert.calledOnceWith(initPluginRoutesStub, RouterStub, pluginConfig);
    });
});
