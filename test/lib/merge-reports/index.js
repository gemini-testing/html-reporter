'use strict';

const _ = require('lodash');
const Promise = require('bluebird');
const mergeReports = require('lib/merge-reports');
const ReportBuilder = require('lib/merge-reports/report-builder');

describe('lib/merge-reports', () => {
    const sandbox = sinon.sandbox.create();

    const execMergeReports_ = async (paths = [], opts = {}) => {
        opts = _.defaults(opts, {destination: 'default-dest-report/path'});

        await mergeReports(paths, opts);
    };

    beforeEach(() => {
        sandbox.stub(ReportBuilder, 'create').returns(Object.create(ReportBuilder.prototype));
        sandbox.stub(ReportBuilder.prototype, 'build').resolves();
    });

    afterEach(() => sandbox.restore());

    describe('options validation', () => {
        it('should throw error if no source reports paths are specified', async () => {
            await assert.isRejected(
                execMergeReports_([]),
                'Nothing to merge, no source reports are passed'
            );
        });

        it('should throw error if destination report path exists in passed source reports paths', async () => {
            await assert.isRejected(
                execMergeReports_(['src-report/path', 'dest-report/path'], {destination: 'dest-report/path'}),
                'Destination report path: dest-report/path, exists in source report paths'
            );
        });
    });

    it('should not fail if only one source report is specified', async () => {
        await assert.isFulfilled(execMergeReports_(['src-report/path']));
    });

    it('should create "ReportBuilder" instance with passed sources and destination paths', async () => {
        await execMergeReports_(['src-report/path-1', 'src-report/path-2'], {destination: 'dest-report/path'});

        assert.calledOnceWith(ReportBuilder.create, ['src-report/path-1', 'src-report/path-2'], 'dest-report/path');
    });

    it('should wait until build report will be finished', async () => {
        const afterBuild = sinon.spy().named('afterBuild');
        ReportBuilder.prototype.build.callsFake(() => Promise.delay(10).then(afterBuild));

        await execMergeReports_(['src-report/path-1', 'src-report/path-2'], {destination: 'dest-report/path'});

        assert.calledOnce(afterBuild);
    });
});
