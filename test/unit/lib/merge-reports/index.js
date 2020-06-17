'use strict';

const _ = require('lodash');
const {stubTool, stubConfig} = require('../../utils');
const mergeReports = require('lib/merge-reports');
const serverUtils = require('lib/server-utils');

describe('lib/merge-reports', () => {
    const sandbox = sinon.sandbox.create();

    const execMergeReports_ = async ({pluginConfig = stubConfig(), hermione = stubTool(stubConfig()), paths = [], opts = {}}) => {
        opts = _.defaults(opts, {destination: 'default-dest-report/path'});

        await mergeReports(pluginConfig, hermione, paths, opts);
    };

    beforeEach(() => {
        sandbox.stub(serverUtils, 'saveStaticFilesToReportDir').resolves();
        sandbox.stub(serverUtils, 'writeDatabaseUrlsFile').resolves();
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
        const hermione = stubTool(pluginConfig);
        const paths = ['src-report/path-1', 'src-report/path-2'];
        const destination = 'dest-report/path';

        await execMergeReports_({pluginConfig, hermione, paths, opts: {destination}});

        assert.calledOnceWith(serverUtils.saveStaticFilesToReportDir, hermione, pluginConfig, destination);
        assert.calledOnceWith(serverUtils.writeDatabaseUrlsFile, destination, paths);
    });
});
