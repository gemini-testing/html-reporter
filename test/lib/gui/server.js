'use strict';

const _ = require('lodash');
const proxyquire = require('proxyquire');
const App = require('lib/gui/app');
const {stubTool} = require('../../utils');

describe('lib/gui/server', () => {
    const sandbox = sinon.createSandbox();
    let server;

    const mkExpressApp_ = () => ({
        use: sandbox.stub(),
        get: sandbox.stub(),
        post: sandbox.stub(),
        listen: sandbox.stub().callsArg(2)
    });

    const startServer = (opts = {}) => {
        opts = _.defaults(opts, {
            paths: [],
            tool: stubTool(),
            configs: {options: {}, pluginConfig: {path: 'default-path'}}
        });

        return server.start(opts.paths, opts.tool, opts.configs);
    };

    beforeEach(() => {
        sandbox.stub(App, 'create').returns(App.prototype);
        sandbox.stub(App.prototype, 'initialize').resolves();
        sandbox.stub(App.prototype, 'close');

        server = proxyquire('lib/gui/server', {
            express: () => mkExpressApp_(),
            '../server-utils': {logger: {log: sandbox.stub()}}
        });
    });

    afterEach(() => sandbox.restore());

    it('should save data file on exit', () => {
        sandbox.stub(process, 'kill');

        return startServer()
            .then(() => {
                process.emit('SIGTERM');

                assert.calledOnce(App.prototype.close);
            });
    });
});
