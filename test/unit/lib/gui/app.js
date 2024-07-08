'use strict';

const _ = require('lodash');
const proxyquire = require('proxyquire');
const Promise = require('bluebird');

const {ToolRunner} = require('lib/gui/tool-runner');
const {stubTool, stubConfig} = require('../../utils');
const {TestplaneConfigAdapter} = require('lib/adapters/config/testplane');

describe('lib/gui/app', () => {
    const sandbox = sinon.createSandbox().usingPromise(Promise);

    let App;
    let tool;
    let toolRunner;
    let looksSame;

    const mkConfigAdapter_ = (config = stubConfig()) => {
        return TestplaneConfigAdapter.create(config);
    };

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
        const config = mkConfigAdapter_(stubConfig({browsers: browserConfigs}));
        tool = stubTool(config);
        toolRunner = mkToolRunner_(tool);
        looksSame = sandbox.stub().named('looksSame').resolves({equal: true});

        App = proxyquire('lib/gui/app', {
            'looks-same': looksSame
        }).App;

        sandbox.stub(ToolRunner, 'create').returns(toolRunner);
    });

    afterEach(() => sandbox.restore());

    describe('run', () => {
        it('should run passed tests', async () => {
            const tests = [{testName: 'abc', browserName: 'yabro'}];
            const App_ = await mkApp_({tool});

            await App_.run(tests);

            assert.calledOnceWith(toolRunner.run, tests);
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
