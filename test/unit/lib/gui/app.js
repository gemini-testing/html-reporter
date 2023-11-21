'use strict';

const _ = require('lodash');
const proxyquire = require('proxyquire');
const Promise = require('bluebird');

const {ToolRunner} = require('lib/gui/tool-runner');
const {stubTool, stubConfig} = require('../../utils');

describe('lib/gui/app', () => {
    const sandbox = sinon.createSandbox().usingPromise(Promise);

    let App;
    let tool;
    let toolRunner;
    let looksSame;

    const mkApp_ = async (opts = {}) => {
        opts = _.defaultsDeep(opts, {
            paths: 'paths',
            tool: stubTool(),
            configs: {program: {name: () => 'tool'}, pluginConfig: {path: 'default-path'}}
        });
        const app = new App(opts.paths, opts.tool, opts.configs);
        await app.initialize();

        return app;
    };

    const mkToolRunner_ = (tool = {}) => {
        return {
            run: sandbox.stub().named('run').resolves(),
            finalize: sandbox.stub().named('finalize'),
            config: tool.config,
            initialize: sandbox.stub().named('initialize').resolves(),
            findEqualDiffs: sandbox.stub().named('findEqualDiffs').resolves()
        };
    };

    beforeEach(() => {
        const browserConfigs = {
            bro1: {id: 'bro1', retry: 1},
            bro2: {id: 'bro2', retry: 2}
        };
        tool = stubTool(stubConfig({browsers: browserConfigs}));
        toolRunner = mkToolRunner_(tool);
        looksSame = sandbox.stub().named('looksSame').resolves({equal: true});

        App = proxyquire('lib/gui/app', {
            'looks-same': looksSame
        }).App;

        sandbox.stub(ToolRunner, 'create').returns(toolRunner);
    });

    afterEach(() => sandbox.restore());

    describe('run', () => {
        it('should run all tests with retries from config', async () => {
            let retryBeforeRun;
            toolRunner.run.callsFake(() => {
                retryBeforeRun = tool.config.forBrowser('bro1').retry;
                return Promise.resolve();
            });
            const App_ = await mkApp_({tool});

            return App_
                .run()
                .then(() => assert.equal(retryBeforeRun, 1));
        });

        it('should run specified tests with no retries', async () => {
            let bro1RetryBeforeRun;
            let bro2RetryBeforeRun;
            toolRunner.run.callsFake(() => {
                bro1RetryBeforeRun = tool.config.forBrowser('bro1').retry;
                bro2RetryBeforeRun = tool.config.forBrowser('bro2').retry;
                return Promise.resolve();
            });
            const App_ = await mkApp_({tool});

            return App_
                .run(['test'])
                .then(() => {
                    assert.equal(bro1RetryBeforeRun, 0);
                    assert.equal(bro2RetryBeforeRun, 0);
                });
        });

        it('should restore config retry values after run', async () => {
            const App_ = await mkApp_({tool});

            return App_
                .run(['test'])
                .then(() => {
                    assert.equal(tool.config.forBrowser('bro1').retry, 1);
                    assert.equal(tool.config.forBrowser('bro2').retry, 2);
                });
        });

        it('should restore config retry values even after error', async () => {
            await toolRunner.run.rejects();
            const App_ = await mkApp_({tool});

            return App_
                .run(['test'])
                .catch(() => {
                    assert.equal(tool.config.forBrowser('bro1').retry, 1);
                    assert.equal(tool.config.forBrowser('bro2').retry, 2);
                });
        });
    });

    describe('findEqualDiffs', () => {
        it('should find equal diffs for passed images', async () => {
            const app = await mkApp_({tool});

            await app.findEqualDiffs('images');

            assert.calledOnceWith(toolRunner.findEqualDiffs, 'images');
        });
    });

    describe('finalize', () => {
        it('should properly complete tool working', async () => {
            const app = await mkApp_({tool});

            app.finalize();

            assert.calledOnce(toolRunner.finalize);
        });
    });
});
