'use strict';

const path = require('path');
const _ = require('lodash');
const proxyquire = require('proxyquire');
const Promise = require('bluebird');

const ToolRunnerFactory = require('lib/gui/tool-runner-factory');
const {stubTool, stubConfig, mkImagesInfo} = require('../../utils');

describe('lib/gui/app', () => {
    const sandbox = sinon.createSandbox().usingPromise(Promise);

    let App;
    let tool;
    let toolRunner;
    let looksSame;

    const mkApp_ = (opts = {}) => {
        opts = _.defaultsDeep(opts, {
            paths: 'paths',
            tool: stubTool(),
            configs: {program: {name: () => 'tool'}, pluginConfig: {path: 'default-path'}}
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
        tool = stubTool(stubConfig({browsers: browserConfigs}));
        toolRunner = mkToolRunner_(tool);
        looksSame = sandbox.stub().named('looksSame').yields(null, {equal: true});

        App = proxyquire('lib/gui/app', {
            'looks-same': looksSame
        });

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

    describe('findEqualDiffs', () => {
        let pluginConfig;
        let compareOpts;

        beforeEach(() => {
            tool = stubTool(stubConfig({tolerance: 100500, antialiasingTolerance: 500100}));
            toolRunner = mkToolRunner_(tool);
            ToolRunnerFactory.create.returns(toolRunner);

            pluginConfig = {path: 'report-path'};
            compareOpts = {tolerance: 100500, antialiasingTolerance: 500100, stopOnFirstFail: true, shouldCluster: false};

            sandbox.stub(path, 'resolve');
        });

        it('should stop comparison on first diff in reference images', async () => {
            const refImagesInfo = mkImagesInfo({expectedImg: {path: 'ref-path-1'}});
            const comparedImagesInfo = [mkImagesInfo({expectedImg: {path: 'ref-path-2'}})];

            path.resolve
                .withArgs(process.cwd(), pluginConfig.path, 'ref-path-1').returns('/ref-path-1')
                .withArgs(process.cwd(), pluginConfig.path, 'ref-path-2').returns('/ref-path-2');

            looksSame.withArgs(
                {source: '/ref-path-1', boundingBox: refImagesInfo.diffClusters[0]},
                {source: '/ref-path-2', boundingBox: comparedImagesInfo[0].diffClusters[0]},
                compareOpts
            ).yields(null, {equal: false});

            const result = await mkApp_({tool, configs: {pluginConfig}})
                .findEqualDiffs([refImagesInfo].concat(comparedImagesInfo));

            assert.calledOnce(looksSame);
            assert.isEmpty(result);
        });

        it('should stop comparison on diff in actual images', async () => {
            const refImagesInfo = mkImagesInfo({actualImg: {path: 'act-path-1'}});
            const comparedImagesInfo = [mkImagesInfo({actualImg: {path: 'act-path-2'}})];

            path.resolve
                .withArgs(process.cwd(), pluginConfig.path, 'act-path-1').returns('/act-path-1')
                .withArgs(process.cwd(), pluginConfig.path, 'act-path-2').returns('/act-path-2');

            looksSame.onFirstCall().yields(null, {equal: true});
            looksSame.withArgs(
                {source: '/act-path-1', boundingBox: refImagesInfo.diffClusters[0]},
                {source: '/act-path-2', boundingBox: comparedImagesInfo[0].diffClusters[0]},
                compareOpts
            ).yields(null, {equal: false});

            const result = await mkApp_({tool, configs: {pluginConfig}})
                .findEqualDiffs([refImagesInfo].concat(comparedImagesInfo));

            assert.calledTwice(looksSame);
            assert.isEmpty(result);
        });

        it('should compare each diff cluster', async () => {
            const refImagesInfo = mkImagesInfo({diffClusters: [
                {left: 0, top: 0, right: 5, bottom: 5},
                {left: 10, top: 10, right: 15, bottom: 15}
            ]});
            const comparedImagesInfo = [mkImagesInfo({diffClusters: [
                {left: 0, top: 0, right: 5, bottom: 5},
                {left: 10, top: 10, right: 15, bottom: 15}
            ]})];

            looksSame.yields(null, {equal: true});

            await mkApp_({tool, configs: {pluginConfig}})
                .findEqualDiffs([refImagesInfo].concat(comparedImagesInfo));

            assert.equal(looksSame.callCount, 4);
        });

        it('should return all found equal diffs', async () => {
            const refImagesInfo = mkImagesInfo();
            const comparedImagesInfo = [mkImagesInfo(), mkImagesInfo()];

            looksSame.yields(null, {equal: true});

            const result = await mkApp_({tool, configs: {pluginConfig}})
                .findEqualDiffs([refImagesInfo].concat(comparedImagesInfo));

            assert.deepEqual(result, comparedImagesInfo);
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
