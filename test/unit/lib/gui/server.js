'use strict';

const _ = require('lodash');
const proxyquire = require('proxyquire');
const {App} = require('lib/gui/app');
const {stubToolAdapter} = require('../../utils');

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
        const toolAdapter = stubToolAdapter();
        const {guiApi} = toolAdapter;

        await startServer({toolAdapter});

        assert.calledOnceWith(guiApi.initServer, expressStub);
        assert.calledOnceWith(guiApi.serverReady, {url: 'http://localhost:4444'});
    });

    it('should init server only after body is parsed', async () => {
        const toolAdapter = stubToolAdapter();
        const {guiApi} = toolAdapter;

        await startServer({toolAdapter});

        assert.callOrder(bodyParserStub.json, guiApi.initServer, guiApi.serverReady);
    });

    it('should init server before any static middleware starts', async () => {
        const toolAdapter = stubToolAdapter();
        const {guiApi} = toolAdapter;

        await startServer({toolAdapter});

        assert.callOrder(guiApi.initServer, staticMiddleware, guiApi.serverReady);
    });

    it('should properly complete app working', async () => {
        sandbox.stub(process, 'kill');
        sandbox.stub(process, 'exit');

        await startServer();

        process.emit('SIGTERM');

        assert.calledOnce(App.prototype.finalize);
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
