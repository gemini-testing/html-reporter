'use strict';

const _ = require('lodash');
const Database = require('better-sqlite3');
const fsOriginal = require('fs-extra');
const proxyquire = require('proxyquire').noPreserveCache();
const {logger} = require('lib/common-utils');
const {stubTool} = require('./utils');

const mkSqliteDb = () => {
    const instance = sinon.createStubInstance(Database);

    instance.prepare = sinon.stub().returns({run: sinon.stub()});

    return instance;
};

describe('lib/hermione', () => {
    const sandbox = sinon.createSandbox();
    let hermione;

    const fs = _.clone(fsOriginal);
    const originalUtils = proxyquire('lib/server-utils', {
        'fs-extra': fs
    });
    const utils = _.clone(originalUtils);

    const {SqliteAdapter} = proxyquire('lib/sqlite-adapter', {
        'fs-extra': fs,
        'better-sqlite3': sinon.stub().returns(mkSqliteDb())
    });

    const {TestAdapter} = proxyquire('lib/test-adapter', {
        'fs-extra': fs,
        './server-utils': utils
    });

    const StaticReportBuilder = proxyquire('lib/report-builder/static', {
        '../server-utils': utils,
        '../sqlite-adapter': {SqliteAdapter},
        '../test-adapter': {TestAdapter}
    });

    const PluginAdapter = proxyquire('lib/plugin-adapter', {
        './server-utils': utils,
        './report-builder/static': StaticReportBuilder,
        './plugin-api': proxyquire('lib/plugin-api', {
            './local-images-saver': proxyquire('lib/local-images-saver', {
                './server-utils': utils
            })
        })
    });

    const HermioneReporter = proxyquire('../../hermione', {
        './lib/plugin-adapter': PluginAdapter
    });

    const events = {
        INIT: 'init',
        TEST_PENDING: 'testPending',
        TEST_PASS: 'testPass',
        TEST_FAIL: 'testFail',
        RETRY: 'retry',
        RUNNER_START: 'startRunner',
        RUNNER_END: 'endRunner',
        AFTER_TESTS_READ: 'afterTestsRead'
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

        return hermione.emitAsync(hermione.events.INIT);
    }

    function mkStubResult_(options = {}) {
        return _.defaultsDeep(options, {
            fullTitle: () => 'default-title',
            file: 'some-file',
            id: () => 'some-id',
            root: true,
            err: {
                type: options.diff && 'ImageDiffError',
                stateName: options.stateName
            }
        });
    }

    async function stubWorkers() {
        await hermione.emitAsync(events.RUNNER_START, {
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

        sandbox.stub(fs, 'ensureDir').resolves();
        sandbox.stub(fs, 'writeFile').resolves();
        sandbox.stub(fs, 'writeJson').resolves();
        sandbox.stub(fs, 'copy').resolves();

        sandbox.stub(utils, 'getCurrentPath');
        sandbox.stub(utils, 'getReferencePath');
        sandbox.stub(utils, 'getDiffPath').returns('/default/path');
        sandbox.stub(utils, 'copyFileAsync');
        sandbox.stub(utils, 'makeDirFor');
        sandbox.stub(utils, 'logPathToHtmlReport');
        sandbox.stub(logger, 'log');
        sandbox.stub(logger, 'warn');

        sandbox.stub(StaticReportBuilder.prototype, 'addSkipped');
        sandbox.stub(StaticReportBuilder.prototype, 'addSuccess');
        sandbox.stub(StaticReportBuilder.prototype, 'addError');
        sandbox.stub(StaticReportBuilder.prototype, 'addFail');
        sandbox.stub(StaticReportBuilder.prototype, 'addRetry');
        sandbox.stub(StaticReportBuilder.prototype, 'saveStaticFiles');
        sandbox.stub(StaticReportBuilder.prototype, 'finalize');

        sandbox.stub(SqliteAdapter.prototype, 'init').resolves({});
        sandbox.stub(SqliteAdapter.prototype, 'query');

        const saveTestImagesImplementation = TestAdapter.prototype.saveTestImages;
        sandbox.stub(TestAdapter.prototype, 'saveTestImages').callsFake(function(...args) {
            return saveTestImagesImplementation.call(this, ...args, new Map()); // disable expectedPath cache
        });

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
        await hermione.emitAsync(hermione.events.RUNNER_END);

        assert.deepEqual(StaticReportBuilder.prototype.addSkipped.args[0][0].state, {name: 'some-title'});
    });

    it('should add passed test to result', async () => {
        await initReporter_();
        hermione.emit(events.TEST_PASS, mkStubResult_({title: 'some-title'}));
        await hermione.emitAsync(hermione.events.RUNNER_END);

        assert.deepEqual(StaticReportBuilder.prototype.addSuccess.args[0][0].state, {name: 'some-title'});
    });

    ['TEST_FAIL', 'RETRY'].forEach((event) => {
        describe('should add', () => {
            it(`errored test to result on ${event} event`, async () => {
                const testResult = mkStubResult_({title: 'some-title', stateName: 'state-name'});
                await initReporter_();

                hermione.emit(events[event], testResult);
                await hermione.emitAsync(hermione.events.RUNNER_END);

                assert.deepEqual(StaticReportBuilder.prototype.addError.args[0][0].state, {name: 'some-title'});
            });

            it(`errored assert view to result on ${event} event`, async () => {
                await initReporter_();
                const err = new Error();
                err.stateName = 'state-name';

                hermione.emit(events[event], mkStubResult_({title: 'some-title', assertViewResults: [err]}));
                await hermione.emitAsync(hermione.events.RUNNER_END);

                assert.deepEqual(StaticReportBuilder.prototype.addError.args[0][0].state, {name: 'some-title'});
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
                await hermione.emitAsync(hermione.events.RUNNER_END);

                assert.deepEqual(StaticReportBuilder.prototype.addFail.args[0][0].state, {name: 'some-title'});
            });

            it(`failed test to result on ${event} event`, async () => {
                await initReporter_();
                await stubWorkers();
                const err = new ImageDiffError();
                err.stateName = 'state-name';

                hermione.emit(events[event], mkStubResult_({title: 'some-title', assertViewResults: [err]}));
                await hermione.emitAsync(hermione.events.RUNNER_END);

                assert.deepEqual(StaticReportBuilder.prototype.addFail.args[0][0].state, {name: 'some-title'});
            });
        });
    });

    it('should save image from passed test', async () => {
        utils.getReferencePath.callsFake((test, stateName) => `report/${stateName}`);

        await initReporter_({path: '/absolute'});
        const testData = mkStubResult_({assertViewResults: [{refImg: {path: 'ref/path'}, stateName: 'plain'}]});
        hermione.emit(events.TEST_PASS, testData);
        await hermione.emitAsync(events.RUNNER_END);

        assert.calledOnceWith(utils.copyFileAsync, 'ref/path', 'report/plain', {reportDir: '/absolute'});
    });

    it('should save image from assert view error', async () => {
        utils.getCurrentPath.callsFake((test, stateName) => `report/${stateName}`);
        await initReporter_({path: '/absolute'});
        const err = new NoRefImageError();
        err.stateName = 'plain';
        err.currImg = {path: 'current/path'};

        hermione.emit(events.RETRY, mkStubResult_({assertViewResults: [err]}));
        await hermione.emitAsync(events.RUNNER_END);

        assert.calledOnceWith(utils.copyFileAsync, 'current/path', 'report/plain', {reportDir: '/absolute'});
    });

    it('should save reference image from assert view fail', async () => {
        utils.getReferencePath.callsFake((test, stateName) => `report/${stateName}`);
        await initReporter_({path: '/absolute'});
        await stubWorkers();

        const err = new ImageDiffError();
        err.stateName = 'plain';
        err.refImg = {path: 'reference/path'};

        hermione.emit(events.TEST_FAIL, mkStubResult_({assertViewResults: [err]}));
        await hermione.emitAsync(events.RUNNER_END);

        assert.calledWith(utils.copyFileAsync, 'reference/path', 'report/plain', {reportDir: '/absolute'});
    });

    it('should save current image from assert view fail', async () => {
        utils.getCurrentPath.callsFake((test, stateName) => `report/${stateName}`);
        await initReporter_({path: '/absolute'});
        await hermione.emitAsync(events.RUNNER_START, {
            registerWorkers: () => {
                return {saveDiffTo: sandbox.stub()};
            }
        });
        const err = new ImageDiffError();
        err.stateName = 'plain';
        err.currImg = {path: 'current/path'};

        hermione.emit(events.TEST_FAIL, mkStubResult_({assertViewResults: [err]}));
        await hermione.emitAsync(events.RUNNER_END);

        assert.calledWith(utils.copyFileAsync, 'current/path', 'report/plain', {reportDir: '/absolute'});
    });

    it('should save current diff image from assert view fail', async () => {
        fs.readFile.resolves(Buffer.from('some-buff'));
        utils.getDiffPath.callsFake((test, stateName) => `report/${stateName}`);
        const saveDiffTo = sinon.stub().resolves();
        const err = new ImageDiffError();
        err.stateName = 'plain';

        await initReporter_();

        await hermione.emitAsync(events.RUNNER_START, {
            registerWorkers: () => {
                return {saveDiffTo};
            }
        });
        hermione.emit(events.TEST_FAIL, mkStubResult_({assertViewResults: [err]}));
        await hermione.emitAsync(events.RUNNER_END);

        assert.calledWith(
            saveDiffTo, sinon.match.instanceOf(ImageDiffError), sinon.match('/report/plain')
        );
    });
});
