'use strict';

const _ = require('lodash');
const Database = require('better-sqlite3');
const fsOriginal = require('fs-extra');
const proxyquire = require('proxyquire').noPreserveCache();
const {logger} = require('lib/common-utils');
const {stubTool, NoRefImageError, ImageDiffError} = require('./utils');

const mkSqliteDb = () => {
    const instance = sinon.createStubInstance(Database);

    instance.prepare = sinon.stub().returns({run: sinon.stub()});

    return instance;
};

describe('lib/hermione', () => {
    const sandbox = sinon.createSandbox();
    let hermione;
    let cacheExpectedPaths = new Map(), cacheAllImages = new Map(), cacheDiffImages = new Map();

    let program;

    const fs = _.clone(fsOriginal);
    const originalUtils = proxyquire('lib/server-utils', {
        'fs-extra': fs
    });
    const utils = _.clone(originalUtils);

    const {SqliteClient} = proxyquire('lib/sqlite-client', {
        'fs-extra': fs,
        'better-sqlite3': sinon.stub().returns(mkSqliteDb())
    });

    const {ImagesInfoSaver} = proxyquire('lib/images-info-saver', {
        'fs-extra': fs,
        './server-utils': utils
    });

    const {TestAdapter} = proxyquire('lib/test-adapter', {
        'fs-extra': fs,
        './server-utils': utils
    });

    const {StaticReportBuilder} = proxyquire('lib/report-builder/static', {
        'fs-extra': fs,
        '../server-utils': utils,
        '../test-adapter': {TestAdapter},
        '../images-info-saver': {ImagesInfoSaver}
    });

    const HtmlReporter = proxyquire('lib/plugin-api', {
        './local-image-file-saver': proxyquire('lib/local-image-file-saver', {
            './server-utils': utils
        })
    }).HtmlReporter;

    const runHtmlReporter = proxyquire('../../hermione', {
        './lib/sqlite-client': {SqliteClient},
        './lib/server-utils': utils,
        './lib/report-builder/static': {StaticReportBuilder},
        './lib/plugin-api': {HtmlReporter}
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

    function mkHermione_() {
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
            commander[prop] = sinon.stub().returns(commander);
        }

        return commander;
    }

    function initReporter_(opts) {
        opts = _.defaults(opts, {
            enabled: true,
            path: 'default-path',
            baseHost: ''
        });

        runHtmlReporter(hermione, opts);

        hermione.emit(hermione.events.CLI, program);

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

        program = mkCommander();

        sandbox.spy(HtmlReporter, 'create');

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

        assert.isObject(hermione.htmlReporter);
    });

    it('should add cli commands', async () => {
        await initReporter_();

        assert.called(program.command);
    });

    it('should add skipped test to result', async () => {
        await initReporter_();
        hermione.emit(events.TEST_PENDING, mkStubResult_({title: 'some-title'}));
        await hermione.emitAsync(hermione.events.RUNNER_END);

        assert.deepEqual(StaticReportBuilder.prototype.addTestResult.args[0][0].state, {name: 'some-title'});
    });

    it('should add passed test to result', async () => {
        await initReporter_();
        hermione.emit(events.TEST_PASS, mkStubResult_({title: 'some-title'}));
        await hermione.emitAsync(hermione.events.RUNNER_END);

        assert.deepEqual(StaticReportBuilder.prototype.addTestResult.args[0][0].state, {name: 'some-title'});
    });

    ['TEST_FAIL', 'RETRY'].forEach((event) => {
        describe('should add', () => {
            it(`errored test to result on ${event} event`, async () => {
                const testResult = mkStubResult_({title: 'some-title', stateName: 'state-name'});
                await initReporter_();

                hermione.emit(events[event], testResult);
                await hermione.emitAsync(hermione.events.RUNNER_END);

                assert.deepEqual(StaticReportBuilder.prototype.addTestResult.args[0][0].state, {name: 'some-title'});
            });

            it(`errored assert view to result on ${event} event`, async () => {
                await initReporter_();
                const err = new Error();
                err.stateName = 'state-name';

                hermione.emit(events[event], mkStubResult_({title: 'some-title', assertViewResults: [err]}));
                await hermione.emitAsync(hermione.events.RUNNER_END);

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

                hermione.emit(events[event], testResult);
                await hermione.emitAsync(hermione.events.RUNNER_END);

                assert.deepEqual(StaticReportBuilder.prototype.addTestResult.args[0][0].state, {name: 'some-title'});
            });

            it(`failed test to result on ${event} event`, async () => {
                await initReporter_();
                await stubWorkers();
                const err = new ImageDiffError();
                err.stateName = 'state-name';

                hermione.emit(events[event], mkStubResult_({title: 'some-title', assertViewResults: [err]}));
                await hermione.emitAsync(hermione.events.RUNNER_END);

                assert.deepEqual(StaticReportBuilder.prototype.addTestResult.args[0][0].state, {name: 'some-title'});
            });
        });
    });
});
