'use strict';

const _ = require('lodash');
const fsOriginal = require('fs-extra');
const proxyquire = require('proxyquire').noPreserveCache();
const {logger} = require('lib/common-utils');
const {stubTool, NoRefImageError, ImageDiffError} = require('./utils');

const mkSqliteDb = () => {
    return {
        run: sinon.stub(),
        prepare: sinon.stub().returns({
            run: sinon.stub(),
            get: sinon.stub(),
            getAsObject: sinon.stub(),
            free: sinon.stub()
        }),
        close: sinon.stub(),
        export: sinon.stub().returns(Buffer.from('mock'))
    };
};

describe('lib/testplane', () => {
    const sandbox = sinon.createSandbox();
    let testplane;
    let cacheExpectedPaths = new Map(), cacheAllImages = new Map(), cacheDiffImages = new Map();
    let fs, originalUtils, utils, SqliteClient, ImagesInfoSaver, TestResultAdapter, StaticReportBuilder, HtmlReporter, runHtmlReporter;

    let program;

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

    function mkTestplane_() {
        return stubTool({
            forBrowser: sinon.stub().returns({
                rootUrl: 'browser/root/url',
                getAbsoluteUrl: _.noop
            }),
            getBrowserIds: () => ['bro1']
        }, events, {ImageDiffError, NoRefImageError});
    }

    function mkCommander() {
        const commander = {};
        const props = [
            'command',
            'allowUnknownOption',
            'description',
            'option',
            'action',
            'on',
            'prependListener'
        ];

        for (const prop of props) {
            commander[prop] = sandbox.stub().returns(commander);
        }

        return commander;
    }

    function initReporter_(opts) {
        opts = _.defaults(opts, {
            enabled: true,
            path: 'default-path',
            baseHost: ''
        });

        runHtmlReporter(testplane, opts);

        testplane.emit(testplane.events.CLI, program);

        return testplane.emitAsync(testplane.events.INIT);
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
        await testplane.emitAsync(events.RUNNER_START, {
            registerWorkers: () => {
                return {saveDiffTo: sandbox.stub()};
            }
        });
    }

    beforeEach(async () => {
        fs = _.clone(fsOriginal);
        originalUtils = proxyquire('lib/server-utils', {
            'fs-extra': fs
        });
        utils = _.clone(originalUtils);

        SqliteClient = proxyquire('lib/sqlite-client', {
            'fs-extra': fs,
            'better-sqlite3': sandbox.stub().returns(mkSqliteDb())
        }).SqliteClient;

        ImagesInfoSaver = proxyquire('lib/images-info-saver', {
            'fs-extra': fs,
            './server-utils': utils
        }).ImagesInfoSaver;

        TestResultAdapter = proxyquire('lib/adapters/test-result', {
            'fs-extra': fs,
            './server-utils': utils
        }).TestResultAdapter;

        StaticReportBuilder = proxyquire('lib/report-builder/static', {
            'fs-extra': fs,
            '../server-utils': utils,
            '../adapters/test-result': {TestResultAdapter},
            '../images-info-saver': {ImagesInfoSaver}
        }).StaticReportBuilder;

        HtmlReporter = proxyquire('lib/plugin-api', {
            './local-image-file-saver': proxyquire('lib/local-image-file-saver', {
                './server-utils': utils
            })
        }).HtmlReporter;

        runHtmlReporter = proxyquire('../../testplane', {
            './lib/sqlite-client': {SqliteClient},
            './lib/server-utils': utils,
            './lib/report-builder/static': {StaticReportBuilder},
            './lib/plugin-api': {HtmlReporter}
        }).default;

        testplane = mkTestplane_();

        program = mkCommander();

        sandbox.spy(HtmlReporter, 'create');

        sandbox.stub(fs, 'readdir').resolves([]);
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

        sandbox.stub(StaticReportBuilder.prototype, 'addTestResult').callsFake(_.identity);
        sandbox.stub(StaticReportBuilder.prototype, 'finalize');

        sandbox.stub(SqliteClient.prototype, 'query');

        sandbox.stub(fs, 'readFile').resolves(Buffer.from(''));
    });

    afterEach(() => {
        cacheAllImages.clear();
        cacheExpectedPaths.clear();
        cacheDiffImages.clear();

        sandbox.restore();
    });

    it('should do nothing if plugin is disabled', async () => {
        await initReporter_({enabled: false});

        assert.notCalled(HtmlReporter.create);
    });

    it('should add api', async () => {
        await initReporter_();

        assert.isObject(testplane.htmlReporter);
    });

    it('should add cli commands', async () => {
        await initReporter_();

        assert.called(program.command);
    });

    it('should add skipped test to result', async () => {
        await initReporter_();
        testplane.emit(events.TEST_PENDING, mkStubResult_({title: 'some-title'}));
        await testplane.emitAsync(testplane.events.RUNNER_END);

        assert.deepEqual(StaticReportBuilder.prototype.addTestResult.args[0][0].state, {name: 'some-title'});
    });

    it('should add passed test to result', async () => {
        await initReporter_();
        testplane.emit(events.TEST_PASS, mkStubResult_({title: 'some-title'}));
        await testplane.emitAsync(testplane.events.RUNNER_END);

        assert.deepEqual(StaticReportBuilder.prototype.addTestResult.args[0][0].state, {name: 'some-title'});
    });

    ['TEST_FAIL', 'RETRY'].forEach((event) => {
        describe('should add', () => {
            it(`errored test to result on ${event} event`, async () => {
                const testResult = mkStubResult_({title: 'some-title', stateName: 'state-name'});
                await initReporter_();

                testplane.emit(events[event], testResult);
                await testplane.emitAsync(testplane.events.RUNNER_END);

                assert.deepEqual(StaticReportBuilder.prototype.addTestResult.args[0][0].state, {name: 'some-title'});
            });

            it(`errored assert view to result on ${event} event`, async () => {
                await initReporter_();
                const err = new Error();
                err.stateName = 'state-name';

                testplane.emit(events[event], mkStubResult_({title: 'some-title', assertViewResults: [err]}));
                await testplane.emitAsync(testplane.events.RUNNER_END);

                assert.deepEqual(StaticReportBuilder.prototype.addTestResult.args[0][0].state, {name: 'some-title'});
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

                testplane.emit(events[event], testResult);
                await testplane.emitAsync(testplane.events.RUNNER_END);

                assert.deepEqual(StaticReportBuilder.prototype.addTestResult.args[0][0].state, {name: 'some-title'});
            });

            it(`failed test to result on ${event} event`, async () => {
                await initReporter_();
                await stubWorkers();
                const err = new ImageDiffError();
                err.stateName = 'state-name';

                testplane.emit(events[event], mkStubResult_({title: 'some-title', assertViewResults: [err]}));
                await testplane.emitAsync(testplane.events.RUNNER_END);

                assert.deepEqual(StaticReportBuilder.prototype.addTestResult.args[0][0].state, {name: 'some-title'});
            });
        });
    });
});
