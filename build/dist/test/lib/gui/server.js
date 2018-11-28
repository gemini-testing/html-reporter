'use strict';
var _ = require('lodash');
var proxyquire = require('proxyquire');
var App = require('lib/gui/app');
var stubTool = require('../../utils').stubTool;
describe('lib/gui/server', function () {
    var sandbox = sinon.createSandbox();
    var server;
    var expressStub;
    var bodyParserStub;
    var staticMiddleware;
    var mkExpressApp_ = function () { return ({
        use: sandbox.stub(),
        get: sandbox.stub(),
        post: sandbox.stub(),
        listen: sandbox.stub().callsArg(2),
        static: sandbox.stub()
    }); };
    var mkApi_ = function () { return ({ initServer: sandbox.stub() }); };
    var startServer = function (opts) {
        if (opts === void 0) { opts = {}; }
        opts = _.defaults(opts, {
            paths: [],
            tool: stubTool(),
            guiApi: mkApi_(),
            configs: { options: {}, pluginConfig: { path: 'default-path' } }
        });
        return server.start(opts);
    };
    beforeEach(function () {
        sandbox.stub(App, 'create').returns(Object.create(App.prototype));
        sandbox.stub(App.prototype, 'initialize').resolves();
        sandbox.stub(App.prototype, 'finalize');
        expressStub = mkExpressApp_();
        staticMiddleware = sandbox.stub();
        bodyParserStub = { json: sandbox.stub() };
        server = proxyquire('lib/gui/server', {
            express: Object.assign(function () { return expressStub; }, { static: staticMiddleware }),
            'body-parser': bodyParserStub,
            'signal-exit': sandbox.stub().yields(),
            '../server-utils': { logger: { log: sandbox.stub() } }
        });
    });
    afterEach(function () { return sandbox.restore(); });
    it('should init server from api', function () {
        var guiApi = mkApi_();
        return startServer({ guiApi: guiApi })
            .then(function () { return assert.calledOnceWith(guiApi.initServer, expressStub); });
    });
    it('should init server only after body is parsed', function () {
        var guiApi = mkApi_();
        return startServer({ guiApi: guiApi })
            .then(function () { return assert.callOrder(bodyParserStub.json, guiApi.initServer); });
    });
    it('should init server before any static middleware starts', function () {
        var guiApi = mkApi_();
        return startServer({ guiApi: guiApi })
            .then(function () { return assert.callOrder(guiApi.initServer, staticMiddleware); });
    });
    it('should properly complete app working', function () {
        sandbox.stub(process, 'kill');
        return startServer()
            .then(function () {
            process.emit('SIGTERM');
            assert.calledOnce(App.prototype.finalize);
        });
    });
});
//# sourceMappingURL=server.js.map