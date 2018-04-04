'use strict';

const _ = require('lodash');
const Promise = require('bluebird');

const App = require('lib/gui/app');
const ToolRunnerFactory = require('lib/gui/tool-runner-factory');
const {stubTool, stubConfig} = require('../../utils');

describe('lib/gui/app', () => {
    const sandbox = sinon.createSandbox().usingPromise(Promise);
    let tool;
    let toolRunner;

    const mkApp_ = (opts = {}) => {
        opts = _.defaults(opts, {
            paths: 'paths',
            tool: stubTool(),
            configs: {program: {name: () => 'tool'}}
        });

        return new App(opts.paths, opts.tool, opts.configs);
    };

    const mkToolRunner_ = (tool = {}) => {
        return {
            run: sandbox.stub().named('run').resolves(),
            finalize: sandbox.stub().named('finalize'),
            config: tool.config
        };
    };

    beforeEach(() => {
        const browserConfigs = {
            bro1: {id: 'bro1', retry: 1},
            bro2: {id: 'bro2', retry: 2}
        };
        tool = stubTool(stubConfig(browserConfigs));
        toolRunner = mkToolRunner_(tool);

        sandbox.stub(ToolRunnerFactory, 'create').returns(toolRunner);
    });

    afterEach(() => sandbox.restore());

    describe('run', () => {
        it('should run all tests with retries from config', () => {
            let retryBeforeRun;
            toolRunner.run.callsFake(() => {
                retryBeforeRun = tool.config.forBrowser('bro1').retry;
                return Promise.resolve();
            });

            return mkApp_({tool})
                .run()
                .then(() => assert.equal(retryBeforeRun, 1));
        });

        it('should run specified tests with no retries', () => {
            let bro1RetryBeforeRun;
            let bro2RetryBeforeRun;
            toolRunner.run.callsFake(() => {
                bro1RetryBeforeRun = tool.config.forBrowser('bro1').retry;
                bro2RetryBeforeRun = tool.config.forBrowser('bro2').retry;
                return Promise.resolve();
            });

            return mkApp_({tool})
                .run(['test'])
                .then(() => {
                    assert.equal(bro1RetryBeforeRun, 0);
                    assert.equal(bro2RetryBeforeRun, 0);
                });
        });

        it('should restore config retry values after run', () => {
            return mkApp_({tool})
                .run(['test'])
                .then(() => {
                    assert.equal(tool.config.forBrowser('bro1').retry, 1);
                    assert.equal(tool.config.forBrowser('bro2').retry, 2);
                });
        });

        it('should restore config retry values even after error', () => {
            toolRunner.run.rejects();

            return mkApp_({tool})
                .run(['test'])
                .catch(() => {
                    assert.equal(tool.config.forBrowser('bro1').retry, 1);
                    assert.equal(tool.config.forBrowser('bro2').retry, 2);
                });
        });
    });

    describe('finalize', () => {
        it('should properly complete tool working', () => {
            const app = mkApp_({tool});

            app.finalize();

            assert.calledOnce(toolRunner.finalize);
        });
    });
});
