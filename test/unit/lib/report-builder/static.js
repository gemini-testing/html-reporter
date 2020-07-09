'use strict';

const fs = require('fs-extra');
const _ = require('lodash');
const Database = require('better-sqlite3');
const proxyquire = require('proxyquire');
const {SUCCESS, FAIL, ERROR, SKIPPED} = require('lib/constants/test-statuses');
const {LOCAL_DATABASE_NAME} = require('lib/constants/file-names');
const TEST_REPORT_PATH = 'test';
const TEST_DB_PATH = `${TEST_REPORT_PATH}/${LOCAL_DATABASE_NAME}`;

describe('StaticReportBuilder', () => {
    const sandbox = sinon.sandbox.create();
    let hasImage, StaticReportBuilder, hermione;

    const formattedSuite_ = () => {
        return {
            browserId: 'bro1',
            suite: {
                fullName: 'suite-full-name',
                path: ['suite'],
                getUrl: function() {
                    return 'url';
                }
            },
            state: {
                name: 'name-default'
            },
            getImagesInfo: () => [],
            getCurrImg: () => {
                return {path: null};
            }
        };
    };

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

    describe('adding test results', () => {
        let reportBuilder;

        beforeEach(async () => {
            reportBuilder = await mkStaticReportBuilder_();
            sandbox.stub(reportBuilder, 'format').returns(formattedSuite_());
        });

        it('should add skipped test to database', async () => {
            await reportBuilder.addSkipped(stubTest_());
            const db = new Database(TEST_DB_PATH);

            const [{status}] = db.prepare('SELECT * from suites').all();
            db.close();

            assert.equal(status, SKIPPED);
        });

        it('should add success test to database', async () => {
            await reportBuilder.addSuccess(stubTest_());
            const db = new Database(TEST_DB_PATH);

            const [{status}] = db.prepare('SELECT * from suites').all();
            db.close();

            assert.equal(status, SUCCESS);
        });

        it('should add failed test to database', async () => {
            await reportBuilder.addFail(stubTest_());
            const db = new Database(TEST_DB_PATH);

            const [{status}] = db.prepare('SELECT * from suites').all();
            db.close();

            assert.equal(status, FAIL);
        });

        it('should add error test to database', async () => {
            await reportBuilder.addError(stubTest_());
            const db = new Database(TEST_DB_PATH);

            const [{status}] = db.prepare('SELECT * from suites').all();
            db.close();

            assert.equal(status, ERROR);
        });

        it('should use timestamp from test result when it is present', async () => {
            reportBuilder.format.returns(_.defaults(formattedSuite_(), {
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

    describe('setBrowsers', () => {
        it('should write browsers to db when the method has called', async () => {
            const reportBuilder = await mkStaticReportBuilder_();

            await reportBuilder.setBrowsers([
                {id: 'chrome'},
                {id: 'firefox'}
            ]);

            const db = new Database(TEST_DB_PATH);
            const res = db.prepare('SELECT * from browsers').all();
            db.close();

            assert.deepEqual(res, [
                {name: 'chrome'},
                {name: 'firefox'}
            ]);
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
