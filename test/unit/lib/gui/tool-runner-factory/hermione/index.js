'use strict';

const _ = require('lodash');
const proxyquire = require('proxyquire');
const ReportBuilder = require('lib/report-builder-factory/report-builder');
const {stubTool, stubConfig, mkTestResult, mkImagesInfo} = require('test/unit/utils');

describe('lib/gui/tool-runner-factory/hermione/index', () => {
    const sandbox = sinon.createSandbox();
    let reportBuilder;
    let ToolGuiReporter;

    const mkTestCollection_ = (testsTree = {}) => {
        return {eachTest: (cb) => _.forEach(testsTree, cb)};
    };

    const stubTest_ = (opts) => {
        return _.defaults(opts, {id: () => 'default-id'});
    };

    const mkToolCliOpts_ = (globalCliOpts = {name: () => 'hermione'}, guiCliOpts = {}) => {
        return {program: globalCliOpts, options: guiCliOpts};
    };
    const mkPluginConfig_ = (config = {}) => {
        const pluginConfig = _.defaults(config, {path: 'default-path'});
        return {pluginConfig};
    };

    const initGuiReporter = (hermione, opts = {}) => {
        opts = _.defaults(opts, {
            paths: [],
            configs: {}
        });

        const configs = _.defaults(opts.configs, mkToolCliOpts_(), mkPluginConfig_());

        return ToolGuiReporter.create(opts.paths, hermione, configs);
    };

    beforeEach(() => {
        reportBuilder = sinon.createStubInstance(ReportBuilder);
        sandbox.stub(ReportBuilder, 'create').returns(reportBuilder);
        reportBuilder.format.returns({prepareTestResult: sandbox.stub()});
        reportBuilder.getResult.returns({});

        ToolGuiReporter = proxyquire(`lib/gui/tool-runner-factory/hermione`, {
            './report-subscriber': sandbox.stub(),
            '../base-tool-runner': proxyquire('lib/gui/tool-runner-factory/base-tool-runner', {
                './utils': {findTestResult: sandbox.stub()},
                '../../reporter-helpers': {updateReferenceImage: sandbox.stub().resolves()}
            })
        });
    });

    afterEach(() => sandbox.restore());

    describe('initialize', () => {
        it('should not add disabled test to report', () => {
            const hermione = stubTool();
            hermione.readTests.resolves(mkTestCollection_({bro: stubTest_({disabled: true})}));

            const gui = initGuiReporter(hermione, {paths: ['foo']});

            return gui.initialize()
                .then(() => {
                    assert.notCalled(reportBuilder.addSkipped);
                    assert.notCalled(reportBuilder.addIdle);
                });
        });

        it('should not add silently skipped test to report', () => {
            const hermione = stubTool();
            hermione.readTests.resolves(mkTestCollection_({bro: stubTest_({silentSkip: true})}));

            const gui = initGuiReporter(hermione, {paths: ['foo']});

            return gui.initialize()
                .then(() => {
                    assert.notCalled(reportBuilder.addSkipped);
                    assert.notCalled(reportBuilder.addIdle);
                });
        });

        it('should add skipped test to report', () => {
            const hermione = stubTool();
            hermione.readTests.resolves(mkTestCollection_({bro: stubTest_({pending: true})}));

            const gui = initGuiReporter(hermione, {paths: ['foo']});

            return gui.initialize()
                .then(() => assert.calledOnce(reportBuilder.addSkipped));
        });

        it('should add idle test to report', () => {
            const hermione = stubTool();
            hermione.readTests.resolves(mkTestCollection_({bro: stubTest_()}));

            const gui = initGuiReporter(hermione, {paths: ['foo']});

            return gui.initialize()
                .then(() => assert.calledOnce(reportBuilder.addIdle));
        });
    });

    describe('updateReferenceImage', () => {
        const mkHermione_ = (config) => {
            const hermione = stubTool(config, {UPDATE_REFERENCE: 'updateReference'});
            sandbox.stub(hermione, 'emit');

            return hermione;
        };

        describe('should emit "UPDATE_REFERENCE" event', () => {
            it('should emit "UPDATE_REFERENCE" event with state and reference data', async () => {
                const getScreenshotPath = sandbox.stub().returns('/ref/path1');
                const config = stubConfig({
                    browsers: {yabro: {getScreenshotPath}}
                });

                const hermione = mkHermione_(config);
                const gui = initGuiReporter(hermione);

                const tests = [mkTestResult({
                    browserId: 'yabro',
                    suite: {path: ['suite1']},
                    state: {},
                    imagesInfo: [mkImagesInfo({
                        stateName: 'plain1',
                        actualImg: {
                            size: {height: 100, width: 200}
                        }
                    })]
                })];

                await gui.updateReferenceImage(tests);

                assert.calledOnceWith(hermione.emit, 'updateReference', {
                    refImg: {path: '/ref/path1', size: {height: 100, width: 200}},
                    state: 'plain1'
                });
            });

            it('for each image info', async () => {
                const getScreenshotPath = sandbox.stub()
                    .onFirstCall().returns('/ref/path1')
                    .onSecondCall().returns('/ref/path2');

                const config = stubConfig({
                    browsers: {yabro: {getScreenshotPath}}
                });

                const hermione = mkHermione_(config);
                const gui = initGuiReporter(hermione);

                const tests = [mkTestResult({
                    browserId: 'yabro',
                    suite: {path: ['suite1']},
                    state: {},
                    imagesInfo: [
                        mkImagesInfo({
                            stateName: 'plain1',
                            actualImg: {
                                size: {height: 100, width: 200}
                            }
                        }),
                        mkImagesInfo({
                            stateName: 'plain2',
                            actualImg: {
                                size: {height: 200, width: 300}
                            }
                        })
                    ]
                })];

                await gui.updateReferenceImage(tests);

                assert.calledTwice(hermione.emit);
                assert.calledWith(hermione.emit.firstCall, 'updateReference', {
                    refImg: {path: '/ref/path1', size: {height: 100, width: 200}},
                    state: 'plain1'
                });
                assert.calledWith(hermione.emit.secondCall, 'updateReference', {
                    refImg: {path: '/ref/path2', size: {height: 200, width: 300}},
                    state: 'plain2'
                });
            });
        });
    });
});
