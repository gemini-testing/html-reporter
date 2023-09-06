'use strict';

const fsOriginal = require('fs-extra');
const _ = require('lodash');
const Database = require('better-sqlite3');
const proxyquire = require('proxyquire');
const {HtmlReporter} = require('lib/plugin-api');
const {SUCCESS, FAIL, ERROR, SKIPPED} = require('lib/constants/test-statuses');
const {LOCAL_DATABASE_NAME} = require('lib/constants/database');

const TEST_REPORT_PATH = 'test';
const TEST_DB_PATH = `${TEST_REPORT_PATH}/${LOCAL_DATABASE_NAME}`;

describe('StaticReportBuilder', () => {
    const sandbox = sinon.sandbox.create();
    let StaticReportBuilder, htmlReporter;

    const fs = _.clone(fsOriginal);

    const originalUtils = proxyquire('lib/server-utils', {
        'fs-extra': fs
    });
    const utils = _.clone(originalUtils);

    const mkStaticReportBuilder_ = async ({pluginConfig} = {}) => {
        pluginConfig = _.defaults(pluginConfig, {baseHost: '', path: TEST_REPORT_PATH, baseTestPath: ''});

        htmlReporter = _.extend(HtmlReporter.create(), {
            reportsSaver: {
                saveReportData: sandbox.stub()
            }
        });

        const reportBuilder = StaticReportBuilder.create(htmlReporter, pluginConfig);
        await reportBuilder.init();

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
            '../server-utils': utils
        }).StaticReportBuilder;
    });

    afterEach(() => {
        fs.removeSync(TEST_DB_PATH);
        sandbox.restore();
    });

    describe('adding test results to database', () => {
        let reportBuilder;

        beforeEach(async () => {
            reportBuilder = await mkStaticReportBuilder_();
        });

        it('should add skipped test', async () => {
            await reportBuilder.addSkipped(stubTest_());
            const db = new Database(TEST_DB_PATH);

            const [{status}] = db.prepare('SELECT * from suites').all();
            db.close();

            assert.equal(status, SKIPPED);
        });

        it('should add success test', async () => {
            await reportBuilder.addSuccess(stubTest_());
            const db = new Database(TEST_DB_PATH);

            const [{status}] = db.prepare('SELECT * from suites').all();
            db.close();

            assert.equal(status, SUCCESS);
        });

        it('should add failed test', async () => {
            await reportBuilder.addFail(stubTest_());
            const db = new Database(TEST_DB_PATH);

            const [{status}] = db.prepare('SELECT * from suites').all();
            db.close();

            assert.equal(status, FAIL);
        });

        it('should add error test', async () => {
            await reportBuilder.addError(stubTest_());
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
