import {ReporterTestResult} from '../index';
import {DbTestResult} from '../../../sqlite-client';
import {getError, getRelativeUrl, getUrlWithBase} from '../../../common-utils';
import _ from 'lodash';

interface Options {
    baseHost?: string;
}

export class DbTestResultTransformer {
    private _options: Options;

    constructor(options: Options) {
        this._options = options;
    }

    transform(testResult: ReporterTestResult): DbTestResult {
        const suiteUrl = getUrlWithBase(testResult.url, this._options.baseHost);

        const metaInfoFull = _.merge(_.cloneDeep(testResult.meta), {
            url: getRelativeUrl(suiteUrl) ?? '',
            file: testResult.file,
            sessionId: testResult.sessionId
        });
        const metaInfo = _.omitBy(metaInfoFull, _.isEmpty);

        return {
            suitePath: testResult.testPath,
            suiteName: _.last(testResult.testPath) as string,
            name: testResult.browserId,
            suiteUrl,
            metaInfo,
            history: testResult.history,
            description: testResult.description,
            error: getError(testResult.error),
            skipReason: testResult.skipReason,
            imagesInfo: testResult.imagesInfo ?? [],
            screenshot: Boolean(testResult.screenshot),
            multipleTabs: testResult.multipleTabs,
            status: testResult.status,
            timestamp: testResult.timestamp ?? Date.now()
        };
    }
}
