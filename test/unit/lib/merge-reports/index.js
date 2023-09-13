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

        mergeReports = proxyquire('lib/merge-reports', {
            '../server-utils': serverUtils,
            'axios': axiosStub
        });
    });

    afterEach(() => sandbox.restore());

    describe('options validation', () => {
        it('should throw error if no source reports paths are specified', async () => {
            await assert.isRejected(
                execMergeReports_({paths: []}),
                'Nothing to merge, no source reports are passed'
            );
        });

        it('should throw error if destination report path exists in passed source reports paths', async () => {
            await assert.isRejected(
                execMergeReports_({paths: ['src-report/path', 'dest-report/path'], opts: {destination: 'dest-report/path'}}),
                'Destination report path: dest-report/path, exists in source report paths'
            );
        });
    });

    it('should merge reports', async () => {
        const pluginConfig = stubConfig();
        const hermione = stubTool(pluginConfig, {}, {}, htmlReporter);
        const paths = ['src-report/path-1.json', 'src-report/path-2.db'];
        const destination = 'dest-report/path';

        await execMergeReports_({pluginConfig, hermione, paths, opts: {destination}});

        assert.calledOnceWith(serverUtils.saveStaticFilesToReportDir, hermione.htmlReporter, pluginConfig, destination);
        assert.calledOnceWith(serverUtils.writeDatabaseUrlsFile, destination, paths);
    });

    it('should resolve json urls while merging reports', async () => {
        const pluginConfig = stubConfig();
        const hermione = stubTool(pluginConfig, {}, {}, htmlReporter);
        const paths = ['src-report/path-1.json'];
        const destination = 'dest-report/path';

        axiosStub.get.withArgs('src-report/path-1.json').resolves({data: {jsonUrls: ['src-report/path-2.json', 'src-report/path-3.json'], dbUrls: ['path-1.db']}});
        axiosStub.get.withArgs('src-report/path-2.json').resolves({data: {jsonUrls: [], dbUrls: ['path-2.db']}});
        axiosStub.get.withArgs('src-report/path-3.json').resolves({data: {jsonUrls: ['src-report/path-4.json'], dbUrls: ['path-3.db']}});
        axiosStub.get.withArgs('src-report/path-4.json').resolves({data: {jsonUrls: [], dbUrls: ['path-4.db']}});

        await execMergeReports_({pluginConfig, hermione, paths, opts: {destination}});

        assert.calledOnceWith(serverUtils.writeDatabaseUrlsFile, destination, ['path-1.db', 'path-2.db', 'path-3.db', 'path-4.db']);
    });

    it('should normalize urls while merging reports', async () => {
        const pluginConfig = stubConfig();
        const hermione = stubTool(pluginConfig, {}, {}, htmlReporter);
        const paths = ['src-report/path-1.json'];
        const destination = 'dest-report/path';

        axiosStub.get.withArgs('src-report/path-1.json').resolves({data: {jsonUrls: ['https://foo.bar/path-2.json']}});
        axiosStub.get.withArgs('https://foo.bar/path-2.json').resolves({data: {jsonUrls: [], dbUrls: ['sqlite.db']}});

        await execMergeReports_({pluginConfig, hermione, paths, opts: {destination}});

        assert.calledOnceWith(serverUtils.writeDatabaseUrlsFile, destination, ['https://foo.bar/sqlite.db']);
    });

    it('should fallback to json url while merging reports', async () => {
        const pluginConfig = stubConfig();
        const hermione = stubTool(pluginConfig, {}, {}, htmlReporter);
        const paths = ['src-report/path-1.json'];
        const destination = 'dest-report/path';

        axiosStub.get.rejects();

        await execMergeReports_({pluginConfig, hermione, paths, opts: {destination}});

        assert.calledOnceWith(serverUtils.writeDatabaseUrlsFile, destination, ['src-report/path-1.json']);
    });

    it('should emit REPORT_SAVED event', async () => {
        const hermione = stubTool({}, {}, {}, htmlReporter);
        const destination = 'dest-report/path';

        await execMergeReports_({pluginConfig: {}, hermione, paths: [''], opts: {destination}});

        assert.calledOnceWith(hermione.htmlReporter.emitAsync, 'reportSaved', {reportPath: destination});
    });
});
