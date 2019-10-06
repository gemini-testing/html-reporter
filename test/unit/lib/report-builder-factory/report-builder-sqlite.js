'use strict';

const path = require('path');
const fs = require('fs-extra');
const _ = require('lodash');
const serverUtils = require('lib/server-utils');
const TestAdapter = require('lib/test-adapter/test-adapter');
const SqliteAdapter = require('lib/sqlite-adapter');
const sqlite3 = require('sqlite3').verbose();
const {logger} = serverUtils;
const proxyquire = require('proxyquire');
const {SUCCESS, FAIL, ERROR, SKIPPED} = require('lib/constants/test-statuses');

describe('ReportBuilderSqlite', () => {
    const sandbox = sinon.sandbox.create();
    let hasImage, ReportBuilder;

    const mkReportBuilder_ = ({toolConfig, pluginConfig} = {}) => {
        toolConfig = _.defaults(toolConfig || {}, {getAbsoluteUrl: _.noop});
        pluginConfig = _.defaults(pluginConfig || {}, {baseHost: '', path: '', baseTestPath: ''});

        const browserConfigStub = {getAbsoluteUrl: toolConfig.getAbsoluteUrl};
        const config = {forBrowser: sandbox.stub().returns(browserConfigStub)};

        TestAdapter.create = (obj) => obj;

        return new ReportBuilder(config, pluginConfig, TestAdapter, true);
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
        sandbox.stub(fs, 'copy').resolves();
        sandbox.stub(fs, 'mkdirs').resolves();
        sandbox.stub(fs, 'mkdirsSync');
        sandbox.stub(fs, 'writeFile').resolves();
        sandbox.stub(fs, 'writeFileSync');
        sandbox.stub(serverUtils, 'prepareCommonJSData');
        sandbox.stub(sqlite3, 'Database');
        sandbox.stub(SqliteAdapter.prototype, '_createTable');
        sandbox.stub(SqliteAdapter.prototype, 'close');

        hasImage = sandbox.stub().returns(true);
        ReportBuilder = proxyquire('lib/report-builder-factory/report-builder-sqlite', {
            '../server-utils': {
                hasImage
            }
        });
        sandbox.stub(ReportBuilder.prototype, '_writeTestResultToDb');
    });

    afterEach(() => sandbox.restore());

    describe('adding test results', () => {
        it('should add skipped test to database', () => {
            const reportBuilder = mkReportBuilder_();
            reportBuilder.addSkipped(stubTest_({
                browserId: 'bro1',
                suite: {
                    skipComment: 'some skip comment',
                    fullName: 'suite-full-name'
                }
            }));
            assert.calledWithMatch(ReportBuilder.prototype._writeTestResultToDb, {
                skipReason: 'some skip comment',
                status: SKIPPED
            });
        });

        it('should add success test to database', () => {
            const reportBuilder = mkReportBuilder_();

            reportBuilder.addSuccess(stubTest_({
                browserId: 'bro1'
            }));
            assert.calledWithMatch(ReportBuilder.prototype._writeTestResultToDb, {status: SUCCESS, name: 'bro1'});
        });

        it('should add failed test to database', () => {
            const reportBuilder = mkReportBuilder_();

            reportBuilder.addFail(stubTest_({
                browserId: 'bro1',
                imageDir: 'some-image-dir'
            }));
            assert.calledWithMatch(ReportBuilder.prototype._writeTestResultToDb, {status: FAIL, name: 'bro1'});
        });

        it('should add error test to database', () => {
            const reportBuilder = mkReportBuilder_();

            reportBuilder.addError(stubTest_({error: 'some-stack-trace'}));
            assert.calledWithMatch(ReportBuilder.prototype._writeTestResultToDb, {
                status: ERROR,
                error: 'some-stack-trace'
            });
        });
    });

    describe('saveDataFileAsync', () => {
        it('should create report directory asynchronously', () => {
            const reportBuilder = mkReportBuilder_({pluginConfig: {path: 'some/report/dir'}});

            return reportBuilder.saveConfigFileAsync()
                .then(() => assert.calledOnceWith(fs.mkdirs, 'some/report/dir'));
        });

        it('should save config file with tests result asynchronously', () => {
            const reportBuilder = mkReportBuilder_({pluginConfig: {path: 'some/report/dir'}});
            serverUtils.prepareCommonJSData.returns('some data');
            return reportBuilder.saveConfigFileAsync()
                .then(() => assert.calledWith(fs.writeFile, path.join('some', 'report', 'dir', 'data.js'), 'some data', 'utf8'));
        });

        it('should create report directory before save config file', () => {
            const reportBuilder = mkReportBuilder_();

            return reportBuilder.saveConfigFileAsync()
                .then(() => assert.callOrder(fs.mkdirs, fs.writeFile));
        });
    });

    describe('save', () => {
        beforeEach(() => {
            sandbox.stub(logger, 'warn');
        });

        it('should copy sql.js files to report directory', async () => {
            const reportBuilder = mkReportBuilder_({pluginConfig: {path: 'some/report/dir'}});

            return reportBuilder.save().then(() => {
                assert.calledWithMatch(fs.copy, 'sql-wasm.js', path.join('some/report/dir', 'sql-wasm.js'));
                assert.calledWithMatch(fs.copy, 'sql-wasm.wasm', path.join('some/report/dir', 'sql-wasm.wasm'));
            });
        });

        it('should copy static files to report directory', () => {
            const reportBuilder = mkReportBuilder_({pluginConfig: {path: 'some/report/dir'}});

            return reportBuilder.save()
                .then(() => {
                    assert.calledWithMatch(fs.copy, 'index.html', path.join('some/report/dir', 'index.html'));
                    assert.calledWithMatch(fs.copy, 'report.min.js', path.join('some/report/dir', 'report.min.js'));
                    assert.calledWithMatch(fs.copy, 'report.min.css', path.join('some/report/dir', 'report.min.css'));
                });
        });
    });
});
