'use strict';

const fsOriginal = require('fs-extra');
const _ = require('lodash');
const Database = require('better-sqlite3');
const proxyquire = require('proxyquire');
const {HtmlReporter} = require('lib/plugin-api');
const {SUCCESS, FAIL, ERROR, SKIPPED} = require('lib/constants/test-statuses');
const {LOCAL_DATABASE_NAME} = require('lib/constants/database');
const {SqliteClient} = require('lib/sqlite-client');
const {NoRefImageError, ImageDiffError} = require('../../utils');
const sinon = require('sinon');
const path = require('path');

const TEST_REPORT_PATH = 'test';
const TEST_DB_PATH = `${TEST_REPORT_PATH}/${LOCAL_DATABASE_NAME}`;

describe('StaticReportBuilder', () => {
    const sandbox = sinon.sandbox.create();
    let StaticReportBuilder, htmlReporter, dbClient;
    let cacheExpectedPaths = new Map(), cacheAllImages = new Map(), cacheDiffImages = new Map();

    const fs = _.clone(fsOriginal);

    const originalUtils = proxyquire('lib/server-utils', {
        'fs-extra': fs
    });
    const utils = _.clone(originalUtils);

    const {ImageHandler} = proxyquire('lib/image-handler', {
        'fs-extra': fs,
        './image-cache': {cacheExpectedPaths, cacheAllImages, cacheDiffImages},
        './server-utils': utils
    });

    const {LocalImagesSaver} = proxyquire('lib/local-images-saver', {
        './server-utils': utils
    });

    const mkStaticReportBuilder_ = async ({pluginConfig, workers} = {}) => {
        pluginConfig = _.defaults(pluginConfig, {baseHost: '', path: TEST_REPORT_PATH, baseTestPath: ''});

        htmlReporter = _.extend(HtmlReporter.create({baseHost: ''}), {
            reportsSaver: {
                saveReportData: sandbox.stub()
            },
            imagesSaver: LocalImagesSaver
        });

        dbClient = await SqliteClient.create({htmlReporter, reportPath: TEST_REPORT_PATH});

        const reportBuilder = StaticReportBuilder.create(htmlReporter, pluginConfig, {dbClient});
        workers = workers ?? {saveDiffTo: () => {}};

        reportBuilder.registerWorkers(workers);

        return reportBuilder;
    };

    const stubTest_ = (opts = {}) => {
        const {imagesInfo = []} = opts;

        return _.defaultsDeep(opts, {
            state: {name: 'name-default'},
            imageDir: '',
            imagesInfo
        });
    };

    beforeEach(() => {
        sandbox.stub(utils, 'hasImage').returns(true);

        StaticReportBuilder = proxyquire('lib/report-builder/static', {
            'fs-extra': fs,
            '../server-utils': utils,
            '../image-handler': {ImageHandler}
        }).StaticReportBuilder;
    });

    afterEach(() => {
        cacheAllImages.clear();
        cacheExpectedPaths.clear();
        cacheDiffImages.clear();

        fs.removeSync(TEST_DB_PATH);
        sandbox.restore();
    });

    describe('adding test results to database', () => {
        let reportBuilder;

        beforeEach(async () => {
            reportBuilder = await mkStaticReportBuilder_();
        });

        it('should add skipped test', async () => {
            await reportBuilder.addSkipped(stubTest_({status: SKIPPED}));
            const db = new Database(TEST_DB_PATH);

            const [{status}] = db.prepare('SELECT * from suites').all();
            db.close();

            assert.equal(status, SKIPPED);
        });

        it('should add success test', async () => {
            await reportBuilder.addSuccess(stubTest_({status: SUCCESS}));
            const db = new Database(TEST_DB_PATH);

            const [{status}] = db.prepare('SELECT * from suites').all();
            db.close();

            assert.equal(status, SUCCESS);
        });

        it('should add failed test', async () => {
            await reportBuilder.addFail(stubTest_({status: FAIL}));
            const db = new Database(TEST_DB_PATH);

            const [{status}] = db.prepare('SELECT * from suites').all();
            db.close();

            assert.equal(status, FAIL);
        });

        it('should add error test', async () => {
            await reportBuilder.addError(stubTest_({status: ERROR}));
            const db = new Database(TEST_DB_PATH);

            const [{status}] = db.prepare('SELECT * from suites').all();
            db.close();

            assert.equal(status, ERROR);
        });

        it('should use timestamp from test result when it is present', async () => {
            await reportBuilder.addSuccess(stubTest_({timestamp: 100500}));
            const db = new Database(TEST_DB_PATH);

            const [{timestamp}] = db.prepare('SELECT * from suites').all();
            db.close();

            assert.equal(timestamp, 100500);
        });

        it('should use some current timestamp when test result misses one', async () => {
            await reportBuilder.addSuccess(stubTest_());
            const db = new Database(TEST_DB_PATH);

            const [{timestamp}] = db.prepare('SELECT * from suites').all();
            db.close();

            assert.isNumber(timestamp);
        });
    });

    describe('saving images', () => {
        let reportBuilder, saveDiffTo;

        beforeEach(async () => {
            saveDiffTo = sinon.stub();

            reportBuilder = await mkStaticReportBuilder_({workers: {saveDiffTo}});

            sandbox.stub(utils, 'getReferencePath');
            sandbox.stub(utils, 'getCurrentPath');
            sandbox.stub(utils, 'getDiffPath').returns('diff');
            sandbox.stub(utils, 'copyFileAsync');
            sandbox.stub(utils, 'makeDirFor');

            sandbox.stub(fs, 'readFile').resolves(Buffer.from(''));
        });

        it('should save image from passed test', async () => {
            utils.getReferencePath.callsFake(({stateName}) => `report/${stateName}`);

            await reportBuilder.addSuccess(stubTest_({assertViewResults: [{refImg: {path: 'ref/path'}, stateName: 'plain'}]}));

            assert.calledOnceWith(utils.copyFileAsync, 'ref/path', 'report/plain', {reportDir: 'test'});
        });

        it('should save image from assert view error', async () => {
            utils.getCurrentPath.callsFake(({stateName}) => `report/${stateName}`);

            const err = new NoRefImageError();
            err.stateName = 'plain';
            err.currImg = {path: 'current/path'};

            await reportBuilder.addFail(stubTest_({assertViewResults: [err]}));

            assert.calledOnceWith(utils.copyFileAsync, 'current/path', 'report/plain', {reportDir: 'test'});
        });

        it('should save reference image from assert view fail', async () => {
            utils.getReferencePath.callsFake(({stateName}) => `report/${stateName}`);

            const err = new ImageDiffError();
            err.stateName = 'plain';
            err.refImg = {path: 'reference/path'};

            await reportBuilder.addFail(stubTest_({assertViewResults: [err]}));

            assert.calledWith(utils.copyFileAsync, 'reference/path', 'report/plain', {reportDir: 'test'});
        });

        it('should save current image from assert view fail', async () => {
            utils.getCurrentPath.callsFake(({stateName}) => `report/${stateName}`);

            const err = new ImageDiffError();
            err.stateName = 'plain';
            err.currImg = {path: 'current/path'};

            await reportBuilder.addFail(stubTest_({assertViewResults: [err]}));

            assert.calledWith(utils.copyFileAsync, 'current/path', 'report/plain', {reportDir: 'test'});
        });

        it('should save current diff image from assert view fail', async () => {
            fs.readFile.resolves(Buffer.from('some-buff'));
            utils.getDiffPath.callsFake(({stateName}) => `report/${stateName}`);

            const err = new ImageDiffError();
            err.stateName = 'plain';

            await reportBuilder.addFail(stubTest_({assertViewResults: [err]}));

            assert.calledWith(
                saveDiffTo, sinon.match.instanceOf(ImageDiffError), sinon.match('/report/plain')
            );
        });
    });

    describe('saving error details', () => {
        let reportBuilder;

        beforeEach(async () => {
            reportBuilder = await mkStaticReportBuilder_({pluginConfig: {saveErrorDetails: true}});

            sandbox.stub(utils, 'makeDirFor').resolves();
            sandbox.stub(utils, 'getDetailsFileName').returns('md5-bro-n-time');

            sandbox.stub(fs, 'writeFile');
            sandbox.stub(fs, 'mkdirs');
        });

        it('should do nothing if no error details are available', async () => {
            await reportBuilder.addFail(stubTest_());

            assert.notCalled(fs.writeFile);
        });

        it('should save error details to correct path', async () => {
            await reportBuilder.addFail(stubTest_({errorDetails: {filePath: 'some-path'}}));

            assert.calledWithMatch(fs.writeFile, path.resolve(`${TEST_REPORT_PATH}/some-path`), sinon.match.any);
        });

        it('should create directory for error details', async () => {
            await reportBuilder.addFail(stubTest_({errorDetails: {filePath: `some-dir/some-path`}}));

            assert.calledOnceWith(fs.mkdirs, path.resolve(TEST_REPORT_PATH, 'some-dir'));
        });

        it('should save error details', async () => {
            const data = {foo: 'bar'};
            await reportBuilder.addFail(stubTest_({errorDetails: {filePath: 'some-path', data}}));

            assert.calledWith(fs.writeFile, sinon.match.any, JSON.stringify(data, null, 2));
        });
    });

    describe('finalization', () => {
        let reportBuilder;

        beforeEach(async () => {
            reportBuilder = await mkStaticReportBuilder_();
            sandbox.stub(fs, 'writeJson');
            sandbox.stub(fs, 'remove');
        });

        it('should not resave databaseUrls file with path to sqlite db when it is not moved', async () => {
            htmlReporter.reportsSaver = null;

            await reportBuilder.finalize();

            assert.notCalled(fs.writeJson);
            assert.notCalled(fs.remove);
        });

        it('should save databaseUrls file with custom path to sqlite db', async () => {
            htmlReporter.reportsSaver.saveReportData.resolves('sqlite-copy.db');

            await reportBuilder.finalize();

            assert.calledWithExactly(fs.writeJson, sinon.match.string, {
                dbUrls: ['sqlite-copy.db'],
                jsonUrls: []
            });
            assert.calledWithExactly(fs.remove, TEST_DB_PATH);
        });

        it('should save databaseUrls file with absolute path to sqlite db', async () => {
            htmlReporter.reportsSaver.saveReportData.resolves('/tmp/sqlite.db');

            await reportBuilder.finalize();

            assert.calledWithExactly(fs.writeJson, sinon.match.string, {
                dbUrls: ['/tmp/sqlite.db'],
                jsonUrls: []
            });
            assert.calledWithExactly(fs.remove, TEST_DB_PATH);
        });

        it('should save databaseUrls file with url to sqlite db', async () => {
            htmlReporter.reportsSaver.saveReportData.resolves('https://localhost/sqlite.db');

            await reportBuilder.finalize();

            assert.calledWithExactly(fs.writeJson, sinon.match.string, {
                dbUrls: ['https://localhost/sqlite.db'],
                jsonUrls: []
            });
            assert.calledWithExactly(fs.remove, TEST_DB_PATH);
        });
    });
});
