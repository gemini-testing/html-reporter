import {ReporterTestAdapter} from 'lib/test-adapter/reporter';
import {ReporterTestResult} from 'lib/test-adapter';

describe('reporterTestAdapter', () => {
    const mkReportResult_ = (result: Partial<ReporterTestResult>): ReporterTestResult => {
        return Object.assign({}, result) as ReporterTestResult;
    };

    it('should return correct state', () => {
        const reportResult = mkReportResult_({testPath: ['path1', 'path2']});
        const testAdapter = new ReporterTestAdapter(reportResult);

        assert.deepEqual(testAdapter.state, {name: 'path2'});
    });
});
