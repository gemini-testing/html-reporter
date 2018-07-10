'use strict';

const _ = require('lodash');
const proxyquire = require('proxyquire');
const ReportBuilder = require('lib/report-builder-factory/report-builder');
const {stubTool} = require('test/utils');

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
        reportBuilder.getResult.returns({});

        ToolGuiReporter = proxyquire(`lib/gui/tool-runner-factory/hermione`, {
            './report-subscriber': sandbox.stub()
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
});
