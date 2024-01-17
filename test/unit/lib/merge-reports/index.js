'use strict';

const _ = require('lodash');
const proxyquire = require('proxyquire');
const {stubTool, stubConfig} = require('../../utils');
const originalServerUtils = require('lib/server-utils');

describe('lib/merge-reports', () => {
    const sandbox = sinon.sandbox.create();
    let htmlReporter, serverUtils, mergeReports, axiosStub;

    const execMergeReports_ = async ({pluginConfig = stubConfig(), hermione = stubTool(stubConfig()), paths = [], opts = {}}) => {
        opts = _.defaults(opts, {destination: 'default-dest-report/path'});

        await mergeReports(pluginConfig, hermione, paths, opts);
    };

    beforeEach(() => {
        serverUtils = _.clone(originalServerUtils);
        axiosStub = {get: sandbox.stub().rejects()};

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

    afterEach(() => sandbox.restore());

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

            it('specified header does not contain "=" separator', async () => {
                await assert.isRejected(
                    execMergeReports_({
                        paths: ['src-report/path-1.json'],
                        opts: {
                            destPath: 'dest-report/path',
                            headers: ['foo_bar']
                        }
                    }),
                    'Header must has key and value separated by "=" symbol, but got "foo_bar"'
                );
            });
        });
    });

    describe('should send headers to request json urls', () => {
        let pluginConfig, hermione, paths, destPath;

        beforeEach(() => {
            pluginConfig = stubConfig();
            hermione = stubTool(pluginConfig, {}, {}, htmlReporter);
            paths = ['src-report/path-1.json'];
            destPath = 'dest-report/path';
        });

        afterEach(() => {
            delete process.env['html_reporter_headers'];
        });

        it('from environment variable', async () => {
            process.env['html_reporter_headers'] = '{"foo":"bar","baz":"qux"}';

            await execMergeReports_({pluginConfig, hermione, paths, opts: {destPath, headers: []}});

            assert.calledOnceWith(
                axiosStub.get,
                'src-report/path-1.json',
                {
                    headers: {
                        foo: 'bar', baz: 'qux'
                    }
                }
            );
        });

        it('from cli option', async () => {
            const headers = ['foo=bar', 'baz=qux'];

            await execMergeReports_({pluginConfig, hermione, paths, opts: {destPath, headers}});

            assert.calledOnceWith(
                axiosStub.get,
                'src-report/path-1.json',
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
            axiosStub.get.withArgs('src-report/path-1.json').resolves({data: {jsonUrls: ['src-report/path-2.json'], dbUrls: []}});

            await execMergeReports_({pluginConfig, hermione, paths, opts: {destPath, headers}});

            assert.calledTwice(axiosStub.get);
            assert.calledWith(
                axiosStub.get.firstCall,
                'src-report/path-1.json',
                {
                    headers: {
                        foo: 'bar', baz: 'qux', abc: 'def'
                    }
                }
            );
            assert.calledWith(
                axiosStub.get.secondCall,
                'src-report/path-2.json',
                {
                    headers: {
                        foo: 'bar', baz: 'qux', abc: 'def'
                    }
                }
            );
        });
    });

    it('should merge reports', async () => {
        const pluginConfig = stubConfig();
        const hermione = stubTool(pluginConfig, {}, {}, htmlReporter);
        const paths = ['src-report/path-1.json', 'src-report/path-2.db'];
        const destPath = 'dest-report/path';

        await execMergeReports_({pluginConfig, hermione, paths, opts: {destPath, headers: []}});

        assert.calledOnceWith(serverUtils.saveStaticFilesToReportDir, hermione.htmlReporter, pluginConfig, destPath);
        assert.calledOnceWith(serverUtils.writeDatabaseUrlsFile, destPath, paths);
    });

    it('should resolve json urls while merging reports', async () => {
        const pluginConfig = stubConfig();
        const hermione = stubTool(pluginConfig, {}, {}, htmlReporter);
        const paths = ['src-report/path-1.json'];
        const destPath = 'dest-report/path';

        axiosStub.get.withArgs('src-report/path-1.json').resolves({data: {jsonUrls: ['src-report/path-2.json', 'src-report/path-3.json'], dbUrls: ['path-1.db']}});
        axiosStub.get.withArgs('src-report/path-2.json').resolves({data: {jsonUrls: [], dbUrls: ['path-2.db']}});
        axiosStub.get.withArgs('src-report/path-3.json').resolves({data: {jsonUrls: ['src-report/path-4.json'], dbUrls: ['path-3.db']}});
        axiosStub.get.withArgs('src-report/path-4.json').resolves({data: {jsonUrls: [], dbUrls: ['path-4.db']}});

        await execMergeReports_({pluginConfig, hermione, paths, opts: {destPath, headers: []}});

        assert.calledOnceWith(serverUtils.writeDatabaseUrlsFile, destPath, ['path-1.db', 'path-2.db', 'path-3.db', 'path-4.db']);
    });

    it('should normalize urls while merging reports', async () => {
        const pluginConfig = stubConfig();
        const hermione = stubTool(pluginConfig, {}, {}, htmlReporter);
        const paths = ['src-report/path-1.json'];
        const destPath = 'dest-report/path';

        axiosStub.get.withArgs('src-report/path-1.json').resolves({data: {jsonUrls: ['https://foo.bar/path-2.json']}});
        axiosStub.get.withArgs('https://foo.bar/path-2.json').resolves({data: {jsonUrls: [], dbUrls: ['sqlite.db']}});

        await execMergeReports_({pluginConfig, hermione, paths, opts: {destPath, headers: []}});

        assert.calledOnceWith(serverUtils.writeDatabaseUrlsFile, destPath, ['https://foo.bar/sqlite.db']);
    });

    it('should fallback to json url while merging reports', async () => {
        const pluginConfig = stubConfig();
        const hermione = stubTool(pluginConfig, {}, {}, htmlReporter);
        const paths = ['src-report/path-1.json'];
        const destPath = 'dest-report/path';

        axiosStub.get.rejects();

        await execMergeReports_({pluginConfig, hermione, paths, opts: {destPath, headers: []}});

        assert.calledOnceWith(serverUtils.writeDatabaseUrlsFile, destPath, ['src-report/path-1.json']);
    });

    it('should emit REPORT_SAVED event', async () => {
        const hermione = stubTool({}, {}, {}, htmlReporter);
        const destPath = 'dest-report/path';

        await execMergeReports_({pluginConfig: {}, hermione, paths: [''], opts: {destPath, headers: []}});

        assert.calledOnceWith(hermione.htmlReporter.emitAsync, 'reportSaved', {reportPath: destPath});
    });
});
