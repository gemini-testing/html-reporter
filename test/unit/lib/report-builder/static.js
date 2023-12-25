'use strict';

const fsOriginal = require('fs-extra');
const _ = require('lodash');
const Database = require('better-sqlite3');
const proxyquire = require('proxyquire');
const sinon = require('sinon');
const {HtmlReporter} = require('lib/plugin-api');
const {ERROR} = require('lib/constants/test-statuses');
const {LOCAL_DATABASE_NAME} = require('lib/constants/database');
const {SqliteClient} = require('lib/sqlite-client');

const TEST_REPORT_PATH = 'test';
const TEST_DB_PATH = `${TEST_REPORT_PATH}/${LOCAL_DATABASE_NAME}`;

describe('StaticReportBuilder', () => {
    const sandbox = sinon.sandbox.create();
    let StaticReportBuilder, htmlReporter, dbClient, workers, imagesInfoSaver;
    let cacheExpectedPaths = new Map(), cacheAllImages = new Map(), cacheDiffImages = new Map();

    const fs = _.clone(fsOriginal);

    const originalUtils = proxyquire('lib/server-utils', {
        'fs-extra': fs
    });
    const utils = _.clone(originalUtils);

    const {ImagesInfoSaver} = proxyquire('lib/images-info-saver', {
        'fs-extra': fs,
        './server-utils': utils
    });

    const {LocalImagesSaver} = proxyquire('lib/local-image-file-saver.ts', {
        './server-utils': utils
    });

    const mkStaticReportBuilder_ = async ({pluginConfig} = {}) => {
        pluginConfig = _.defaults(pluginConfig, {baseHost: '', path: TEST_REPORT_PATH, baseTestPath: ''});

        htmlReporter = _.extend(HtmlReporter.create({baseHost: ''}), {
            reportsSaver: {
                saveReportData: sandbox.stub()
            },
            imagesSaver: LocalImagesSaver
        });

        dbClient = await SqliteClient.create({htmlReporter, reportPath: TEST_REPORT_PATH});
        imagesInfoSaver = sinon.createStubInstance(ImagesInfoSaver);

        imagesInfoSaver.save.callsFake(_.identity);

        const reportBuilder = StaticReportBuilder.create(htmlReporter, pluginConfig, {dbClient, imagesInfoSaver});
        workers = {saveDiffTo: sinon.stub()};

        reportBuilder.registerWorkers(workers);

        return reportBuilder;
    };

    const stubTest_ = (opts = {}) => {
        return _.defaultsDeep(opts, {
            state: {name: 'name-default'},
            imageDir: '',
            imagesInfo: []
        });
    };

    beforeEach(() => {
        StaticReportBuilder = proxyquire('lib/report-builder/static', {
            'fs-extra': fs,
            '../server-utils': utils,
            '../images-info-saver': {ImagesInfoSaver}
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

        it('should use test results status', async () => {
            await reportBuilder.addTestResult(stubTest_({status: ERROR}));
            const db = new Database(TEST_DB_PATH);

            const [{status}] = db.prepare('SELECT * from suites').all();
            db.close();

            assert.equal(status, ERROR);
        });

        it('should use timestamp from test result when it is present', async () => {
            await reportBuilder.addTestResult(stubTest_({timestamp: 100500}));
            const db = new Database(TEST_DB_PATH);

            const [{timestamp}] = db.prepare('SELECT * from suites').all();
            db.close();

            assert.equal(timestamp, 100500);
        });

        it('should use some current timestamp when test result misses one', async () => {
            await reportBuilder.addTestResult(stubTest_());
            const db = new Database(TEST_DB_PATH);

            const [{timestamp}] = db.prepare('SELECT * from suites').all();
            db.close();

            assert.isNumber(timestamp);
        });
    });

    describe('saving images', () => {
        let reportBuilder;

        beforeEach(async () => {
            reportBuilder = await mkStaticReportBuilder_();
        });

        it('should use images info saver to save images', async () => {
            const testResult = stubTest_({assertViewResults: [{refImg: {path: 'ref/path'}, stateName: 'plain'}]});

            await reportBuilder.addTestResult(testResult);

            assert.calledOnceWith(imagesInfoSaver.save, testResult, workers);
        });
    });

    describe('saving error details', () => {
        beforeEach(async () => {
            sandbox.stub(utils, 'saveErrorDetails').resolves();
        });

        it('should not save error details if turned off', async () => {
            const reportBuilder = await mkStaticReportBuilder_({
                pluginConfig: {saveErrorDetails: false, path: TEST_REPORT_PATH}
            });
            const testResult = stubTest_({errorDetails: {filePath: 'some-path'}});

            await reportBuilder.addTestResult(testResult);

            assert.notCalled(utils.saveErrorDetails);
        });

        it('should use server-utils to save error details if needed', async () => {
            const reportBuilder = await mkStaticReportBuilder_({
                pluginConfig: {saveErrorDetails: true, path: TEST_REPORT_PATH}
            });
            const testResult = stubTest_({errorDetails: {filePath: 'some-path'}});

            await reportBuilder.addTestResult(testResult);

            assert.calledOnceWith(utils.saveErrorDetails, testResult, TEST_REPORT_PATH);
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
