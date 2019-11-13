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
});
