'use strict';

const fs = require('fs-extra');
const _ = require('lodash');
const Database = require('better-sqlite3');
const proxyquire = require('proxyquire');
const {SUCCESS, FAIL, ERROR, SKIPPED} = require('lib/constants/test-statuses');
const {LOCAL_DATABASE_NAME} = require('lib/constants/file-names');
const {mkFormattedTest} = require('../../utils');

const TEST_REPORT_PATH = 'test';
const TEST_DB_PATH = `${TEST_REPORT_PATH}/${LOCAL_DATABASE_NAME}`;

describe('StaticReportBuilder', () => {
    const sandbox = sinon.sandbox.create();
    let hasImage, StaticReportBuilder, hermione;

    const mkStaticReportBuilder_ = async ({toolConfig = {}, pluginConfig} = {}) => {
        toolConfig = _.defaults(toolConfig, {getAbsoluteUrl: _.noop});
        pluginConfig = _.defaults(pluginConfig, {baseHost: '', path: TEST_REPORT_PATH, baseTestPath: ''});

        const browserConfigStub = {getAbsoluteUrl: toolConfig.getAbsoluteUrl};
        hermione = {
            forBrowser: sandbox.stub().returns(browserConfigStub),
            on: sandbox.spy(),
            htmlReporter: {
                reportsSaver: {
                    saveReportData: sandbox.stub()
                }
            }
        };

        const reportBuilder = StaticReportBuilder.create(hermione, pluginConfig);
        await reportBuilder.init();

        return reportBuilder;
    };

    const stubTest_ = (opts = {}) => {
        const {imagesInfo = []} = opts;

        return _.defaultsDeep(opts, {
            state: {name: 'name-default'},
            suite: {
                path: ['suite'],
                metaInfo: {sessionId: 'sessionId-default'},
                file: 'default/path/file.js',
                getUrl: () => opts.suite.url || ''
            },
            imageDir: '',
            imagesInfo,
            getImagesInfo: () => imagesInfo,
            getImagesFor: () => ({}),
            getRefImg: () => ({}),
            getCurrImg: () => ({}),
            getErrImg: () => ({})
        });
    };

    beforeEach(() => {
        hasImage = sandbox.stub().returns(true);

        StaticReportBuilder = proxyquire('lib/report-builder/static', {
            '../server-utils': {hasImage}
        });
    });

    afterEach(() => {
        fs.removeSync(TEST_DB_PATH);
        sandbox.restore();
    });

    describe('adding test results to database', () => {
        let reportBuilder;

        beforeEach(async () => {
            reportBuilder = await mkStaticReportBuilder_();
            sandbox.stub(reportBuilder, 'format').returns(mkFormattedTest());
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
            reportBuilder.format.returns(_.defaults(mkFormattedTest(), {
                timestamp: 100500
            }));
            await reportBuilder.addSuccess(stubTest_());
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
            hermione.htmlReporter.reportsSaver = null;

            await reportBuilder.finalize();

            assert.notCalled(fs.writeJson);
            assert.notCalled(fs.remove);
        });

        it('should save databaseUrls file with custom path to sqlite db', async () => {
            hermione.htmlReporter.reportsSaver.saveReportData.resolves('sqlite-copy.db');

            await reportBuilder.finalize();

            assert.calledWithExactly(fs.writeJson, sinon.match.string, {
                dbUrls: ['sqlite-copy.db'],
                jsonUrls: []
            });
            assert.calledWithExactly(fs.remove, TEST_DB_PATH);
        });

        it('should save databaseUrls file with absolute path to sqlite db', async () => {
            hermione.htmlReporter.reportsSaver.saveReportData.resolves('/tmp/sqlite.db');

            await reportBuilder.finalize();

            assert.calledWithExactly(fs.writeJson, sinon.match.string, {
                dbUrls: ['/tmp/sqlite.db'],
                jsonUrls: []
            });
            assert.calledWithExactly(fs.remove, TEST_DB_PATH);
        });

        it('should save databaseUrls file with url to sqlite db', async () => {
            hermione.htmlReporter.reportsSaver.saveReportData.resolves('https://localhost/sqlite.db');

            await reportBuilder.finalize();

            assert.calledWithExactly(fs.writeJson, sinon.match.string, {
                dbUrls: ['https://localhost/sqlite.db'],
                jsonUrls: []
            });
            assert.calledWithExactly(fs.remove, TEST_DB_PATH);
        });
    });
});
