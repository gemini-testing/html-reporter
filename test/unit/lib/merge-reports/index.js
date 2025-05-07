'use strict';

const path = require('path');
const _ = require('lodash');
const fs = require('fs-extra');
const proxyquire = require('proxyquire');
const {stubToolAdapter} = require('../../utils');
const originalServerUtils = require('lib/server-utils');
const {IMAGES_PATH, SNAPSHOTS_PATH, ERROR_DETAILS_PATH, LOCAL_DATABASE_NAME, DATABASE_URLS_JSON_NAME} = require('lib/constants');

describe('lib/merge-reports', () => {
    const sandbox = sinon.sandbox.create();
    let htmlReporter, serverUtils, mergeReports, axiosStub, consoleWarnBackup;

    const execMergeReports_ = async ({toolAdapter = stubToolAdapter(), paths = [], opts = {}}) => {
        opts = _.defaults(opts, {destination: 'default-dest-report/path'});

        await mergeReports(toolAdapter, paths, opts);
    };

    beforeEach(() => {
        consoleWarnBackup = console.warn;
        console.warn = sandbox.stub();

        serverUtils = _.clone(originalServerUtils);
        axiosStub = {get: sandbox.stub().rejects()};

        sandbox.stub(fs, 'pathExists').resolves(true);
        sandbox.stub(fs, 'copy').resolves();
        sandbox.stub(fs, 'readJSON').resolves({});
        sandbox.stub(fs, 'stat').resolves({isDirectory: () => true});

        sandbox.stub(serverUtils, 'saveStaticFilesToReportDir').resolves();
        sandbox.stub(serverUtils, 'writeDatabaseUrlsFile').resolves();

        htmlReporter = sinon.stub();
        htmlReporter.events = {REPORT_SAVED: 'reportSaved'};
        htmlReporter.emitAsync = sinon.stub();
        htmlReporter.imagesSaver = {saveImg: sinon.stub()};
        htmlReporter.config = {};

        mergeReports = proxyquire('lib/merge-reports', {
            '../server-utils': serverUtils,
            'axios': axiosStub
        });
    });

    afterEach(() => {
        console.warn = consoleWarnBackup;
        sandbox.restore();
    });

    describe('options validation', () => {
        describe('should throw error if', () => {
            it('no source reports paths are specified', async () => {
                await assert.isRejected(
                    execMergeReports_({paths: []}),
                    'Nothing to merge, no source reports are passed'
                );
            });

            it('destination report path exists in passed source reports paths', async () => {
                await assert.isRejected(
                    execMergeReports_({
                        paths: ['src-report/path', 'dest-report/path'],
                        opts: {destPath: 'dest-report/path'}
                    }),
                    'Destination report path: dest-report/path, exists in source report paths'
                );
            });

            it('specified report path does not exist on fs', async () => {
                const accessError = new Error('folder does not exist');
                accessError.code = 'ENOENT';

                fs.stat.withArgs('src-report/path-1').rejects(accessError);

                await assert.isRejected(
                    execMergeReports_({
                        paths: ['src-report/path-1', 'src-report/path-2'],
                        opts: {destPath: 'dest-report/path'}
                    }),
                    'Specified source path: src-report/path-1 doesn\'t exists on file system'
                );
            });

            it('get stats of specified report path failed', async () => {
                const statError = new Error('permission denied');
                statError.code = 'EACCES';

                fs.stat.withArgs('src-report/path-1').rejects(statError);

                await assert.isRejected(
                    execMergeReports_({
                        paths: ['src-report/path-1', 'src-report/path-2'],
                        opts: {destPath: 'dest-report/path'}
                    }),
                    statError.message
                );
            });

            it(`${DATABASE_URLS_JSON_NAME} doesn't exist in specified report path`, async () => {
                fs.stat.withArgs('src-report/path-1').resolves({isDirectory: () => true});
                fs.pathExists.withArgs(`src-report/path-1/${DATABASE_URLS_JSON_NAME}`).resolves(false);

                await assert.isRejected(
                    execMergeReports_({
                        paths: ['src-report/path-1', 'src-report/path-2'],
                        opts: {destPath: 'dest-report/path'}
                    }),
                    `${DATABASE_URLS_JSON_NAME} doesn't exist in specified source path: src-report/path-1`
                );
            });

            it(`specified file in report path doesn't end with ${LOCAL_DATABASE_NAME} or ${DATABASE_URLS_JSON_NAME}`, async () => {
                fs.stat.withArgs('src-report/path-1/some-file.json').resolves({isDirectory: () => false});

                await assert.isRejected(
                    execMergeReports_({
                        paths: ['src-report/path-1/some-file.json', 'src-report/path-2'],
                        opts: {destPath: 'dest-report/path'}
                    }),
                    `Specified source path: src-report/path-1/some-file.json must ends with ${DATABASE_URLS_JSON_NAME} or ${LOCAL_DATABASE_NAME}`
                );
            });

            it('specified header does not contain "=" separator', async () => {
                fs.stat.resolves({isDirectory: () => true});
                fs.pathExists.resolves(true);

                await assert.isRejected(
                    execMergeReports_({
                        paths: ['src-report/path-1', 'src-report/path-2'],
                        opts: {
                            destPath: 'dest-report/path',
                            headers: ['foo_bar']
                        }
                    }),
                    'Header must has key and value separated by "=" symbol, but got "foo_bar"'
                );
            });
        });

        describe('should warn if', () => {
            it('only one source report path is specified', async () => {
                await execMergeReports_({paths: ['src-report/path'], opts: {destPath: 'dest-report/path', headers: []}});

                assert.calledWithMatch(
                    console.warn,
                    /Only one source report is passed/
                );
            });
        });
    });

    describe('should send headers to request json urls', () => {
        let toolAdapter, paths, destPath;

        beforeEach(() => {
            toolAdapter = stubToolAdapter({htmlReporter});
            paths = ['https://ci.ru/path-1.json', 'https://ci.ru/path-2.json'];
            destPath = 'dest-report/path';
        });

        afterEach(() => {
            delete process.env['html_reporter_headers'];
        });

        it('from environment variable', async () => {
            process.env['html_reporter_headers'] = '{"foo":"bar","baz":"qux"}';

            await execMergeReports_({toolAdapter, paths, opts: {destPath, headers: []}});

            assert.calledWith(
                axiosStub.get.firstCall,
                'https://ci.ru/path-1.json',
                {
                    headers: {
                        foo: 'bar', baz: 'qux'
                    }
                }
            );
        });

        it('from cli option', async () => {
            const headers = ['foo=bar', 'baz=qux'];

            await execMergeReports_({toolAdapter, paths, opts: {destPath, headers}});

            assert.calledWith(
                axiosStub.get.firstCall,
                'https://ci.ru/path-1.json',
                {
                    headers: {
                        foo: 'bar', baz: 'qux'
                    }
                }
            );
        });

        it('from env variable and cli option for each request', async () => {
            process.env['html_reporter_headers'] = '{"foo":"bar","baz":"qux"}';
            const headers = ['foo=123', 'abc=def'];
            axiosStub.get.withArgs('https://ci.ru/path-1.json').resolves({data: {jsonUrls: ['https://ci.ru/path-2.json'], dbUrls: []}});

            await execMergeReports_({toolAdapter, paths, opts: {destPath, headers}});

            assert.calledWith(
                axiosStub.get.firstCall,
                'https://ci.ru/path-1.json',
                {
                    headers: {
                        foo: 'bar', baz: 'qux', abc: 'def'
                    }
                }
            );
            assert.calledWith(
                axiosStub.get.secondCall,
                'https://ci.ru/path-2.json',
                {
                    headers: {
                        foo: 'bar', baz: 'qux', abc: 'def'
                    }
                }
            );
        });
    });

    it('should merge reports with folder paths', async () => {
        const toolAdapter = stubToolAdapter({htmlReporter});
        const paths = ['https://ci.ru', 'src-report-1'];
        const destPath = 'dest-report/path';

        axiosStub.get.withArgs('https://ci.ru/databaseUrls.json').resolves({data: {jsonUrls: [], dbUrls: ['sqlite.db']}});
        fs.readJSON.withArgs('src-report-1/databaseUrls.json').resolves({jsonUrls: [], dbUrls: ['sqlite.db']});

        await execMergeReports_({toolAdapter, paths, opts: {destPath, headers: []}});

        assert.calledOnceWith(serverUtils.saveStaticFilesToReportDir, toolAdapter.htmlReporter, toolAdapter.reporterConfig, destPath);
        assert.calledOnceWith(serverUtils.writeDatabaseUrlsFile, destPath, ['https://ci.ru/sqlite.db', 'sqlite.db']);
    });

    it('should merge reports with database paths', async () => {
        const toolAdapter = stubToolAdapter({htmlReporter});
        const paths = ['https://ci.ru/sqlite.db', 'src-report-1/sqlite.db', 'src-report-2/sqlite.db'];
        const destPath = 'dest-report/path';

        await execMergeReports_({toolAdapter, paths, opts: {destPath, headers: []}});

        assert.calledOnceWith(serverUtils.saveStaticFilesToReportDir, toolAdapter.htmlReporter, toolAdapter.reporterConfig, destPath);
        assert.calledOnceWith(serverUtils.writeDatabaseUrlsFile, destPath, ['https://ci.ru/sqlite.db', 'sqlite_1.db', 'sqlite_2.db']);
    });

    it('should merge reports with database paths', async () => {
        const toolAdapter = stubToolAdapter({htmlReporter});
        const paths = ['https://ci.ru/sqlite.db', 'src-report-1/sqlite.db', 'src-report-2/sqlite.db'];
        const destPath = 'dest-report/path';

        await execMergeReports_({toolAdapter, paths, opts: {destPath, headers: []}});

        assert.calledOnceWith(serverUtils.saveStaticFilesToReportDir, toolAdapter.htmlReporter, toolAdapter.reporterConfig, destPath);
        assert.calledOnceWith(serverUtils.writeDatabaseUrlsFile, destPath, ['https://ci.ru/sqlite.db', 'sqlite_1.db', 'sqlite_2.db']);
    });

    it('should resolve json paths and urls while merging reports', async () => {
        const toolAdapter = stubToolAdapter({htmlReporter});
        const paths = ['src-report-1/path-1.json', 'src-report-2/path-2.json'];
        const destPath = 'dest-report/path';

        fs.readJSON.withArgs('src-report-1/path-1.json').resolves({jsonUrls: ['path-2.json', 'https://ci.ru/path-3.json'], dbUrls: ['sqlite-1.db']});
        fs.readJSON.withArgs('src-report-1/path-2.json').resolves({jsonUrls: [], dbUrls: ['sqlite-2.db']});
        axiosStub.get.withArgs('https://ci.ru/path-3.json').resolves({data: {jsonUrls: ['https://ci.ru/path-4.json'], dbUrls: ['sqlite-3.db']}});
        axiosStub.get.withArgs('https://ci.ru/path-4.json').resolves({data: {jsonUrls: [], dbUrls: ['sqlite-4.db']}});

        await execMergeReports_({toolAdapter, paths, opts: {destPath, headers: []}});

        assert.calledOnceWith(serverUtils.writeDatabaseUrlsFile, destPath, ['https://ci.ru/sqlite-3.db', 'https://ci.ru/sqlite-4.db', 'sqlite-1_1.db', 'sqlite-2_2.db']);
    });

    it('should normalize urls while merging reports', async () => {
        const toolAdapter = stubToolAdapter({htmlReporter});
        const paths = ['src-report-1/path-1.json', 'src-report-2/path-2.json'];
        const destPath = 'dest-report/path';

        fs.readJSON.withArgs('src-report-1/path-1.json').resolves({jsonUrls: ['https://foo.bar/path-2.json']});
        axiosStub.get.withArgs('https://foo.bar/path-2.json').resolves({data: {jsonUrls: [], dbUrls: ['sqlite.db']}});

        await execMergeReports_({toolAdapter, paths, opts: {destPath, headers: []}});

        assert.calledOnceWith(serverUtils.writeDatabaseUrlsFile, destPath, ['https://foo.bar/sqlite.db']);
    });

    it('should copy only local database paths with uniq name', async () => {
        const toolAdapter = stubToolAdapter({htmlReporter});
        const paths = ['https://ci.ru/sqlite.db', 'src-report-1/sqlite.db', 'src-report-2/sqlite.db'];
        const destPath = 'dest-report/path';

        const srcDb1 = path.resolve(process.cwd(), 'src-report-1/sqlite.db');
        const srcDb2 = path.resolve(process.cwd(), 'src-report-2/sqlite.db');
        const destDb1 = path.resolve(destPath, 'sqlite_1.db');
        const destDb2 = path.resolve(destPath, 'sqlite_2.db');

        await execMergeReports_({toolAdapter, paths, opts: {destPath, headers: []}});

        assert.calledWith(fs.copy.firstCall, srcDb1, destDb1);
        assert.calledWith(fs.copy.secondCall, srcDb2, destDb2);
    });

    [IMAGES_PATH, SNAPSHOTS_PATH, ERROR_DETAILS_PATH].forEach(folderName => {
        describe(`copy artifacts from folder "${folderName}`, () => {
            it('should not copy artifacts if passed urls on database', async () => {
                const toolAdapter = stubToolAdapter({htmlReporter});
                const paths = ['https://ci.ru/sqlite_1.db', 'https://ci.ru/sqlite_2.db'];
                const destPath = 'dest-report/path';

                await execMergeReports_({toolAdapter, paths, opts: {destPath, headers: []}});

                assert.notCalled(fs.copy);
            });

            it('should not copy artifacts if folder does not exist', async () => {
                const toolAdapter = stubToolAdapter({htmlReporter});
                const paths = ['src-report-1/sqlite.db', 'src-report-2/sqlite.db'];
                const destPath = 'dest-report/path';

                const srcArtifactPath = path.resolve(process.cwd(), 'src-report-1', folderName);
                const destArtifactPath = path.resolve(process.cwd(), destPath, folderName);
                fs.pathExists.withArgs(srcArtifactPath).resolves(false);

                await execMergeReports_({toolAdapter, paths, opts: {destPath, headers: []}});

                assert.neverCalledWith(fs.copy, srcArtifactPath, destArtifactPath);
            });

            it('should copy artifacts if folder exists', async () => {
                const toolAdapter = stubToolAdapter({htmlReporter});
                const paths = ['src-report-1/sqlite.db', 'src-report-2/sqlite.db'];
                const destPath = 'dest-report/path';

                const srcArtifactPath = path.resolve(process.cwd(), 'src-report-1', folderName);
                const destArtifactPath = path.resolve(process.cwd(), destPath, folderName);
                fs.pathExists.withArgs(srcArtifactPath).resolves(true);

                await execMergeReports_({toolAdapter, paths, opts: {destPath, headers: []}});

                assert.calledWith(fs.copy, srcArtifactPath, destArtifactPath, {recursive: true, overwrite: false});
            });
        });
    });

    it('should emit REPORT_SAVED event', async () => {
        const toolAdapter = stubToolAdapter({htmlReporter});
        const destPath = 'dest-report/path';

        await execMergeReports_({toolAdapter, paths: ['', ''], opts: {destPath, headers: []}});

        assert.calledOnceWith(toolAdapter.htmlReporter.emitAsync, 'reportSaved', {reportPath: destPath});
    });
});
