'use strict';

const _ = require('lodash');
const fs = require('fs-extra');
const HermioneReporter = require('../../hermione');
const PluginAdapter = require('lib/plugin-adapter');
const ReportBuilder = require('lib/report-builder-factory/report-builder-json');
const utils = require('lib/server-utils');
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
        RUNNER_START: 'startRunner',
        RUNNER_END: 'endRunner'
    };

    class ImageDiffError extends Error {
        constructor() {
            super();
            this.stateName = '';
            this.currImg = {
                path: ''
            };
            this.refImg = {
                path: ''
            };
        }
    }

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
            fullTitle: () => 'default-title',
            id: () => 'some-id',
            err: {
                type: options.diff && 'ImageDiffError',
                stateName: options.stateName
            }
        });
    }

    async function stubWorkers() {
        await hermione.emitAndWait(events.RUNNER_START, {
            registerWorkers: () => {
                return {saveDiffTo: sandbox.stub()};
            }
        });
    }

    beforeEach(async () => {
        hermione = mkHermione_();

        sandbox.spy(PluginAdapter.prototype, 'addApi');
        sandbox.spy(PluginAdapter.prototype, 'addCliCommands');
        sandbox.spy(PluginAdapter.prototype, 'init');

        sandbox.stub(fs, 'mkdirs').resolves();
        sandbox.stub(fs, 'writeFile').resolves();
        sandbox.stub(fs, 'copy').resolves();

        sandbox.stub(utils, 'getCurrentPath');
        sandbox.stub(utils, 'getReferencePath');
        sandbox.stub(utils, 'getDiffPath').returns('/default/path');
        sandbox.stub(utils, 'copyImageAsync');
        sandbox.stub(utils, 'makeDirFor');
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

        sandbox.stub(fs, 'readFile').resolves(Buffer.from(''));
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

    it('should add skipped test to result', async () => {
        await initReporter_();
        hermione.emit(events.TEST_PENDING, mkStubResult_({title: 'some-title'}));
        await hermione.emitAndWait(hermione.events.RUNNER_END);

        assert.deepEqual(ReportBuilder.prototype.addSkipped.args[0][0].state, {name: 'some-title'});
    });

    it('should add passed test to result', async () => {
        await initReporter_();
        hermione.emit(events.TEST_PASS, mkStubResult_({title: 'some-title'}));
        await hermione.emitAndWait(hermione.events.RUNNER_END);

        assert.deepEqual(ReportBuilder.prototype.addSuccess.args[0][0].state, {name: 'some-title'});
    });

    ['TEST_FAIL', 'RETRY'].forEach((event) => {
        describe('should add', () => {
            it(`errored test to result on ${event} event`, async () => {
                const testResult = mkStubResult_({title: 'some-title', stateName: 'state-name'});
                await initReporter_();

                hermione.emit(events[event], testResult);
                await hermione.emitAndWait(hermione.events.RUNNER_END);

                assert.deepEqual(ReportBuilder.prototype.addError.args[0][0].state, {name: 'some-title'});
            });

            it(`errored assert view to result on ${event} event`, async () => {
                await initReporter_();
                const err = new Error();
                err.stateName = 'state-name';

                hermione.emit(events[event], mkStubResult_({title: 'some-title', assertViewResults: [err]}));
                await hermione.emitAndWait(hermione.events.RUNNER_END);

                assert.deepEqual(ReportBuilder.prototype.addError.args[0][0].state, {name: 'some-title'});
            });

            it(`failed test to result on ${event} event`, async () => {
                await initReporter_();
                await stubWorkers();
                const err = new ImageDiffError();
                err.stateName = 'state-name';
                const testResult = mkStubResult_({
                    title: 'some-title',
                    assertViewResults: [err]
                });

                hermione.emit(events[event], testResult);
                await hermione.emitAndWait(hermione.events.RUNNER_END);

                assert.deepEqual(ReportBuilder.prototype.addFail.args[0][0].state, {name: 'some-title'});
            });

            it(`failed test to result on ${event} event`, async () => {
                await initReporter_();
                await stubWorkers();
                const err = new ImageDiffError();
                err.stateName = 'state-name';

                hermione.emit(events[event], mkStubResult_({title: 'some-title', assertViewResults: [err]}));
                await hermione.emitAndWait(hermione.events.RUNNER_END);

                assert.deepEqual(ReportBuilder.prototype.addFail.args[0][0].state, {name: 'some-title'});
            });
        });
    });

    it('should set values added through api', async () => {
        await initReporter_();

        hermione.htmlReporter.addExtraItem('key1', 'value1');
        hermione.htmlReporter.addMetaInfoExtender('key2', 'value2');
        hermione.htmlReporter.imagesSaver = {some: 'saver'};

        await hermione.emitAndWait(hermione.events.RUNNER_END);

        assert.calledOnceWith(ReportBuilder.prototype.setApiValues, {
            extraItems: {key1: 'value1'},
            metaInfoExtenders: {key2: 'value2'},
            imagesSaver: {some: 'saver'}
        });
    });

    it('should save statistic', () => {
        return initReporter_()
            .then(() => hermione.emitAndWait(hermione.events.RUNNER_END, {some: 'stat'}))
            .then(() => assert.calledOnceWith(ReportBuilder.prototype.setStats, {some: 'stat'}));
    });

    it('should save image from passed test', async () => {
        utils.getReferencePath.callsFake((test, stateName) => `report/${stateName}`);

        await initReporter_({path: '/absolute'});
        const testData = mkStubResult_({assertViewResults: [{refImg: {path: 'ref/path'}, stateName: 'plain'}]});
        hermione.emit(events.TEST_PASS, testData);
        await hermione.emitAndWait(events.RUNNER_END);

        assert.calledOnceWith(utils.copyImageAsync, 'ref/path', 'report/plain', '/absolute');
    });

    it('should save image from assert view error', async () => {
        utils.getCurrentPath.callsFake((test, stateName) => `report/${stateName}`);
        await initReporter_({path: '/absolute'});
        const err = new NoRefImageError();
        err.stateName = 'plain';
        err.currImg = {path: 'current/path'};

        hermione.emit(events.RETRY, mkStubResult_({assertViewResults: [err]}));
        await hermione.emitAndWait(events.RUNNER_END);

        assert.calledOnceWith(utils.copyImageAsync, 'current/path', 'report/plain', '/absolute');
    });

    it('should save reference image from assert view fail', async () => {
        utils.getReferencePath.callsFake((test, stateName) => `report/${stateName}`);
        await initReporter_({path: '/absolute'});
        await stubWorkers();

        const err = new ImageDiffError();
        err.stateName = 'plain';
        err.refImg = {path: 'reference/path'};

        hermione.emit(events.TEST_FAIL, mkStubResult_({assertViewResults: [err]}));
        await hermione.emitAndWait(events.RUNNER_END);

        assert.calledWith(utils.copyImageAsync, 'reference/path', 'report/plain', '/absolute');
    });

    it('should save current image from assert view fail', async () => {
        utils.getCurrentPath.callsFake((test, stateName) => `report/${stateName}`);
        await initReporter_({path: '/absolute'});
        await hermione.emitAndWait(events.RUNNER_START, {
            registerWorkers: () => {
                return {saveDiffTo: sandbox.stub()};
            }
        });
        const err = new ImageDiffError();
        err.stateName = 'plain';
        err.currImg = {path: 'current/path'};

        hermione.emit(events.TEST_FAIL, mkStubResult_({assertViewResults: [err]}));
        await hermione.emitAndWait(events.RUNNER_END);

        assert.calledWith(utils.copyImageAsync, 'current/path', 'report/plain', '/absolute');
    });

    it('should save current diff image from assert view fail', async () => {
        fs.readFile.resolves(Buffer.from('some-buff'));
        utils.getDiffPath.callsFake((test, stateName) => `report/${stateName}`);
        const saveDiffTo = sinon.stub().resolves();
        const err = new ImageDiffError();
        err.stateName = 'plain';

        await initReporter_();

        await hermione.emitAndWait(events.RUNNER_START, {
            registerWorkers: () => {
                return {saveDiffTo};
            }
        });
        hermione.emit(events.TEST_FAIL, mkStubResult_({assertViewResults: [err]}));
        await hermione.emitAndWait(events.RUNNER_END);

        assert.calledWith(
            saveDiffTo, sinon.match.instanceOf(ImageDiffError), sinon.match('/report/plain')
        );
    });
});
