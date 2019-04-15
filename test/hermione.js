'use strict';

const _ = require('lodash');
const fs = require('fs-extra');
const HermioneReporter = require('../hermione');
const PluginAdapter = require('lib/plugin-adapter');
const ReportBuilder = require('lib/report-builder-factory/report-builder');
const utils = require('../lib/server-utils');
const {stubTool} = require('./utils');

describe('lib/hermione', () => {
    const sandbox = sinon.createSandbox();
    let hermione;

    const events = {
        INIT: 'init',
        TEST_PENDING: 'testPending',
        TEST_PASS: 'testPass',
        TEST_FAIL: 'testFail',
        RETRY: 'retry',
        RUNNER_END: 'runnerEnd'
    };

    class ImageDiffError extends Error {}
    class NoRefImageError extends Error {}

    function mkHermione_() {
        return stubTool({
            forBrowser: sinon.stub().returns({
                rootUrl: 'browser/root/url',
                getAbsoluteUrl: _.noop
            }),
            getBrowserIds: () => ['bro1']
        }, events, {ImageDiffError, NoRefImageError});
    }

    function initReporter_(opts) {
        opts = _.defaults(opts, {
            enabled: true,
            path: 'default-path',
            baseHost: ''
        });

        HermioneReporter(hermione, opts);

        return hermione.emitAndWait(hermione.events.INIT);
    }

    function mkStubResult_(options = {}) {
        return _.defaultsDeep(options, {
            err: {
                type: options.diff && 'ImageDiffError',
                stateName: options.stateName
            }
        });
    }

    beforeEach(() => {
        hermione = mkHermione_();

        sandbox.spy(PluginAdapter.prototype, 'addApi');
        sandbox.spy(PluginAdapter.prototype, 'addCliCommands');
        sandbox.spy(PluginAdapter.prototype, 'init');

        sandbox.stub(fs, 'mkdirs').resolves();
        sandbox.stub(fs, 'writeFile').resolves();
        sandbox.stub(fs, 'copy').resolves();

        sandbox.stub(utils, 'copyImageAsync');
        sandbox.stub(utils, 'getCurrentAbsolutePath');
        sandbox.stub(utils, 'getReferenceAbsolutePath');
        sandbox.stub(utils, 'saveDiff');
        sandbox.stub(utils, 'saveDiffInWorker');
        sandbox.stub(utils, 'getDiffAbsolutePath');
        sandbox.stub(utils, 'logPathToHtmlReport');
        sandbox.stub(utils.logger, 'log');
        sandbox.stub(utils.logger, 'warn');

        sandbox.spy(ReportBuilder.prototype, 'setStats');
        sandbox.stub(ReportBuilder.prototype, 'addSkipped');
        sandbox.stub(ReportBuilder.prototype, 'addSuccess');
        sandbox.stub(ReportBuilder.prototype, 'addError');
        sandbox.stub(ReportBuilder.prototype, 'addFail');
        sandbox.stub(ReportBuilder.prototype, 'addRetry');
        sandbox.stub(ReportBuilder.prototype, 'setApiValues');
        sandbox.stub(ReportBuilder.prototype, 'save');
    });

    afterEach(() => sandbox.restore());

    it('should do nothing if plugin is disabled', () => {
        return initReporter_({enabled: false}).then(() => {
            assert.notCalled(PluginAdapter.prototype.addCliCommands);
        });
    });

    it('should add api', () => {
        return initReporter_()
            .then(() => assert.calledOnce(PluginAdapter.prototype.addCliCommands));
    });

    it('should add cli commands', () => {
        return initReporter_()
            .then(() => assert.calledOnce(PluginAdapter.prototype.addCliCommands));
    });

    it('should init plugin', () => {
        return initReporter_().then(() => assert.calledOnce(PluginAdapter.prototype.init));
    });

    it('should add skipped test to result', () => {
        return initReporter_()
            .then(() => {
                hermione.emit(events.TEST_PENDING, {title: 'some-title'});

                assert.calledOnceWith(ReportBuilder.prototype.addSkipped, {title: 'some-title'});
            });
    });

    it('should add passed test to result', () => {
        return initReporter_()
            .then(() => {
                hermione.emit(events.TEST_PASS, {title: 'some-title'});

                assert.calledOnceWith(ReportBuilder.prototype.addSuccess, {title: 'some-title'});
            });
    });

    ['TEST_FAIL', 'RETRY'].forEach((event) => {
        describe('should add', () => {
            it(`errored test to result on ${event} event`, () => {
                return initReporter_()
                    .then(() => {
                        const testResult = mkStubResult_({title: 'some-title', stateName: 'state-name'});

                        hermione.emit(events[event], testResult);

                        assert.calledOnceWith(
                            ReportBuilder.prototype.addError,
                            sinon.match({title: 'some-title'})
                        );
                    });
            });

            it(`errored assert view to result on ${event} event`, () => {
                return initReporter_()
                    .then(() => {
                        const err = new Error();
                        err.stateName = 'state-name';

                        hermione.emit(events[event], {title: 'some-title', assertViewResults: [err]});

                        assert.calledOnceWith(
                            ReportBuilder.prototype.addError,
                            sinon.match({title: 'some-title'})
                        );
                    });
            });

            it(`failed test to result on ${event} event`, () => {
                return initReporter_()
                    .then(() => {
                        const err = new ImageDiffError();
                        err.stateName = 'state-name';
                        const testResult = mkStubResult_({
                            title: 'some-title',
                            assertViewResults: [err]
                        });

                        hermione.emit(events[event], testResult);

                        assert.calledOnceWith(
                            ReportBuilder.prototype.addFail,
                            sinon.match({title: 'some-title'})
                        );
                    });
            });

            it(`failed test to result on ${event} event`, () => {
                return initReporter_()
                    .then(() => {
                        const err = new ImageDiffError();
                        err.stateName = 'state-name';

                        hermione.emit(events[event], {title: 'some-title', assertViewResults: [err]});

                        assert.calledOnceWith(
                            ReportBuilder.prototype.addFail,
                            sinon.match({title: 'some-title'})
                        );
                    });
            });
        });
    });

    it('should set values added through api', async () => {
        await initReporter_();

        hermione.htmlReporter.addExtraItem('key1', 'value1');
        hermione.htmlReporter.addMetaInfoExtender('key2', 'value2');

        await hermione.emitAndWait(hermione.events.RUNNER_END);

        assert.calledOnceWith(ReportBuilder.prototype.setApiValues, {
            extraItems: {key1: 'value1'},
            metaInfoExtenders: {key2: 'value2'}
        });
    });

    it('should save statistic', () => {
        return initReporter_()
            .then(() => hermione.emitAndWait(hermione.events.RUNNER_END, {some: 'stat'}))
            .then(() => assert.calledOnceWith(ReportBuilder.prototype.setStats, {some: 'stat'}));
    });

    it('should save image from passed test', () => {
        utils.getReferenceAbsolutePath.callsFake((test, path, stateName) => `${path}/report/${stateName}`);

        return initReporter_({path: '/absolute'})
            .then(() => {
                const testData = {assertViewResults: [{refImg: {path: 'ref/path'}, stateName: 'plain'}]};
                hermione.emit(events.TEST_PASS, testData);
                return hermione.emitAndWait(events.RUNNER_END);
            })
            .then(() => assert.calledOnceWith(utils.copyImageAsync, 'ref/path', '/absolute/report/plain'));
    });

    it('should save image from assert view error', () => {
        utils.getCurrentAbsolutePath.callsFake((test, path, stateName) => `${path}/report/${stateName}`);

        return initReporter_({path: '/absolute'})
            .then(() => {
                const err = new NoRefImageError();
                err.stateName = 'plain';
                err.currImg = {path: 'current/path'};
                hermione.emit(events.RETRY, {assertViewResults: [err]});

                return hermione.emitAndWait(events.RUNNER_END);
            })
            .then(() => assert.calledOnceWith(utils.copyImageAsync, 'current/path', '/absolute/report/plain'));
    });

    it('should save reference image from assert view fail', () => {
        utils.getReferenceAbsolutePath.callsFake((test, path) => `${path}/report`);

        return initReporter_({path: '/absolute'})
            .then(() => {
                const err = new ImageDiffError();
                err.stateName = 'some-name';
                err.refImg = {path: 'reference/path'};
                hermione.emit(events.TEST_FAIL, {assertViewResults: [err]});
                return hermione.emitAndWait(events.RUNNER_END);
            })
            .then(() => assert.calledWith(utils.copyImageAsync, 'reference/path', '/absolute/report'));
    });

    it('should save current image from assert view fail', () => {
        utils.getCurrentAbsolutePath.callsFake((test, path) => `${path}/report`);

        return initReporter_({path: '/absolute'})
            .then(() => {
                const err = new ImageDiffError();
                err.stateName = 'some-name';
                err.currImg = {path: 'current/path'};
                hermione.emit(events.TEST_FAIL, {assertViewResults: [err]});
                return hermione.emitAndWait(events.RUNNER_END);
            })
            .then(() => assert.calledWith(utils.copyImageAsync, 'current/path', '/absolute/report'));
    });

    it('should save current diff image from assert view fail', () => {
        utils.getDiffAbsolutePath.callsFake((test, path) => `${path}/report`);

        return initReporter_({path: '/absolute'})
            .then(() => {
                const err = new ImageDiffError();
                err.stateName = 'some-name';
                err.saveDiffTo = sinon.stub();
                hermione.emit(events.TEST_FAIL, {assertViewResults: [err]});
                return hermione.emitAndWait(events.RUNNER_END);
            })
            .then(() => assert.calledWith(
                utils.saveDiffInWorker, sinon.match.any, sinon.match.instanceOf(ImageDiffError), '/absolute/report'
            ));
    });
});
