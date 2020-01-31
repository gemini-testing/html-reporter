'use strict';

const fs = require('fs-extra');
const _ = require('lodash');
const Database = require('better-sqlite3');
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

    const mkReportBuilder_ = async ({toolConfig = {}, pluginConfig} = {}) => {
        toolConfig = _.defaults(toolConfig, {getAbsoluteUrl: _.noop});
        pluginConfig = _.defaults(pluginConfig, {baseHost: '', path: 'test', baseTestPath: ''});

        const browserConfigStub = {getAbsoluteUrl: toolConfig.getAbsoluteUrl};
        const config = {forBrowser: sandbox.stub().returns(browserConfigStub), htmlReporter: {saveImg: sandbox.stub()}};

        const reportBuilder = ReportBuilder.create(config, pluginConfig);
        await reportBuilder.init();

        return reportBuilder;
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
            const db = new Database('test/sqlite.db');

            const [{status}] = db.prepare('SELECT * from suites').all();
            db.close();

            assert.equal(status, SKIPPED);
        });

        it('should add success test to database', async () => {
            await reportBuilderSqlite.addSuccess(stubTest_());
            const db = new Database('test/sqlite.db');

            const [{status}] = db.prepare('SELECT * from suites').all();
            db.close();

            assert.equal(status, SUCCESS);
        });

        it('should add failed test to database', async () => {
            await reportBuilderSqlite.addFail(stubTest_());
            const db = new Database('test/sqlite.db');

            const [{status}] = db.prepare('SELECT * from suites').all();
            db.close();

            assert.equal(status, FAIL);
        });

        it('should add error test to database', async () => {
            await reportBuilderSqlite.addError(stubTest_());
            const db = new Database('test/sqlite.db');

            const [{status}] = db.prepare('SELECT * from suites').all();
            db.close();

            assert.equal(status, ERROR);
        });
    });
});
