'use strict';

const _ = require('lodash');
const proxyquire = require('proxyquire');
const App = require('lib/gui/app');
const {stubTool} = require('../../utils');

describe('lib/gui/server', () => {
    const sandbox = sinon.createSandbox();
    let server;
    let expressStub;
    let bodyParserStub;
    let staticMiddleware;

    const mkExpressApp_ = () => ({
        use: sandbox.stub(),
        get: sandbox.stub(),
        set: sandbox.stub(),
        post: sandbox.stub(),
        listen: sandbox.stub().callsArg(2),
        static: sandbox.stub()
    });

    const mkApi_ = () => ({initServer: sandbox.stub()});

    const startServer = (opts = {}) => {
        opts = _.defaults(opts, {
            paths: [],
            tool: stubTool(),
            guiApi: mkApi_(),
            configs: {options: {}, pluginConfig: {path: 'default-path'}}
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
        bodyParserStub = {json: sandbox.stub()};

        server = proxyquire('lib/gui/server', {
            express: Object.assign(() => expressStub, {static: staticMiddleware}),
            'body-parser': bodyParserStub,
            'signal-exit': sandbox.stub().yields(),
            '../server-utils': {logger: {log: sandbox.stub()}}
        });
    });

    afterEach(() => sandbox.restore());

    it('should init server from api', () => {
        const guiApi = mkApi_();

        return startServer({guiApi})
            .then(() => assert.calledOnceWith(guiApi.initServer, expressStub));
    });

    it('should init server only after body is parsed', () => {
        const guiApi = mkApi_();

        return startServer({guiApi})
            .then(() => assert.callOrder(bodyParserStub.json, guiApi.initServer));
    });

    it('should init server before any static middleware starts', () => {
        const guiApi = mkApi_();

        return startServer({guiApi})
            .then(() => assert.callOrder(guiApi.initServer, staticMiddleware));
    });

    it('should properly complete app working', () => {
        sandbox.stub(process, 'kill');

        return startServer()
            .then(() => {
                process.emit('SIGTERM');

                assert.calledOnce(App.prototype.finalize);
            });
    });

    it('should correctly set json replacer', async () => {
        const guiApi = mkApi_();

        await startServer({guiApi});

        assert.calledOnceWith(expressStub.set, 'json replacer', sinon.match.func);
    });
});
