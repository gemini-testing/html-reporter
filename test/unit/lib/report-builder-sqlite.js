'use strict';

const fs = require('fs-extra');
const _ = require('lodash');
const sqlite3 = require('sqlite3').verbose();
const proxyquire = require('proxyquire');
const {SUCCESS, FAIL, ERROR, SKIPPED} = require('lib/constants/test-statuses');

describe('ReportBuilderSqlite', () => {
    const sandbox = sinon.sandbox.create();
    let hasImage, ReportBuilder, reportBuilderSqlite;

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

    const mkReportBuilder_ = ({toolConfig = {}, pluginConfig} = {}) => {
        toolConfig = _.defaults(toolConfig, {getAbsoluteUrl: _.noop});
        pluginConfig = _.defaults(pluginConfig, {baseHost: '', path: 'test', baseTestPath: ''});

        const browserConfigStub = {getAbsoluteUrl: toolConfig.getAbsoluteUrl};
        const config = {forBrowser: sandbox.stub().returns(browserConfigStub), htmlReporter: {saveImg: sandbox.stub()}};
        return ReportBuilder.create(config, pluginConfig);
    };

    const stubTest_ = (opts = {}) => {
        const {imagesInfo = []} = opts;

        let attempt = 0;
        if (opts.attempt === undefined) {
            Object.defineProperty(opts, 'attempt', {get: () => attempt++});
        }

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
        ReportBuilder = proxyquire('lib/report-builder/report-builder-sqlite', {
            '../server-utils': {
                hasImage
            }
        });
    });

    afterEach(() => {
        fs.unlinkSync('test/sqlite.db');
        sandbox.restore();
    });

    describe('adding test results', () => {
        beforeEach(async () => {
            reportBuilderSqlite = await mkReportBuilder_();
            sandbox.stub(reportBuilderSqlite, 'format').returns(formattedSuite_());
        });

        it('should add skipped test to database', async () => {
            await reportBuilderSqlite.addSkipped(stubTest_());

            const db = new sqlite3.Database('test/sqlite.db');
            await db.all('SELECT * from suites', function(err, result) {
                db.close();

                assert.equal(result[0].status, SKIPPED);
            });
        });

        it('should add success test to database', async () => {
            await reportBuilderSqlite.addSuccess(stubTest_());

            const db = new sqlite3.Database('test/sqlite.db');
            await db.all('SELECT * from suites', function(err, result) {
                db.close();

                assert.equal(result[0].status, SUCCESS);
            });
        });

        it('should add failed test to database', async () => {
            await reportBuilderSqlite.addFail(stubTest_());

            const db = new sqlite3.Database('test/sqlite.db');
            await db.all('SELECT * from suites', function(err, result) {
                db.close();

                assert.equal(result[0].status, FAIL);
            });
        });

        it('should add error test to database', async () => {
            await reportBuilderSqlite.addError(stubTest_());

            const db = new sqlite3.Database('test/sqlite.db');
            await db.all('SELECT * from suites', function(err, result) {
                db.close();

                assert.equal(result[0].status, ERROR);
            });
        });
    });

    describe('working with database', () => {
        it('should create database', async () => {
            await mkReportBuilder_();
            assert.equal(fs.existsSync('test/sqlite.db'), true);
        });

        it('should create database with correct structure', async () => {
            await mkReportBuilder_();
            const db = new sqlite3.Database('test/sqlite.db');
            const tableStructure = [
                {cid: 0, name: 'suitePath', type: 'TEXT'},
                {cid: 1, name: 'suiteName', type: 'TEXT'},
                {cid: 2, name: 'name', type: 'TEXT'},
                {cid: 3, name: 'suiteUrl', type: 'TEXT'},
                {cid: 4, name: 'metaInfo', type: 'TEXT'},
                {cid: 5, name: 'description', type: 'TEXT'},
                {cid: 6, name: 'error', type: 'TEXT'},
                {cid: 7, name: 'skipReason', type: 'TEXT'},
                {cid: 8, name: 'imagesInfo', type: 'TEXT'},
                {cid: 9, name: 'screenshot', type: 'INT'},
                {cid: 10, name: 'multipleTabs', type: 'INT'},
                {cid: 11, name: 'status', type: 'TEXT'},
                {cid: 12, name: 'timestamp', type: 'INT'}
            ];

            db.all('PRAGMA table_info(suites);', function(err, columns) {
                db.close();
                columns.map((column, index) => {
                    assert.match(column.cid, tableStructure[index].cid);
                    assert.match(column.name, tableStructure[index].name);
                    assert.match(column.type, tableStructure[index].type);
                });
            });
        });
    });
});
