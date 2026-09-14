import {ReporterTestResult} from '../index';
import {DbTestResult} from '../../../sqlite-client';
import {getError, getUrlWithBase} from '../../../common-utils';
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
        const imagesInfo = (testResult.imagesInfo ?? []).map(imageInfo => {
            if (!_.isObject(imageInfo) || !('error' in imageInfo) || !imageInfo.error) {
                return imageInfo;
            }

            return {
                ...imageInfo,
                error: getError(imageInfo.error)
            };
        });

        const metaInfoFull = _.merge(_.cloneDeep(testResult.meta), {
            url: testResult.meta?.url ?? suiteUrl ?? '',
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
            imagesInfo,
            screenshot: Boolean(testResult.screenshot),
            multipleTabs: testResult.multipleTabs,
            status: testResult.status,
            timestamp: testResult.timestamp ?? Date.now(),
            duration: testResult.duration,
            attachments: testResult.attachments
        };
    }
}
