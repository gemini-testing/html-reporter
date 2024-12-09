import _ from 'lodash';
import {ReporterTestResult} from '../index';
import {TupleToUnion} from 'type-fest';
import {ErrorDetails, ImageInfoDiff, ImageInfoFull} from '../../../types';
import {ERROR_DETAILS_PATH} from '../../../constants';
import {ReporterTestAdapter} from '../reporter';
import {getDetailsFileName, isImageBufferData} from '../../../common-utils';

export const copyAndUpdate = (
    original: ReporterTestResult,
    updates: Partial<ReporterTestResult>
): ReporterTestResult => {
    const keys = [
        'attempt',
        'browserId',
        'description',
        'error',
        'errorDetails',
        'file',
        'fullName',
        'history',
        'id',
        'imageDir',
        'imagesInfo',
        'meta',
        'multipleTabs',
        'screenshot',
        'sessionId',
        'skipReason',
        'state',
        'status',
        'testPath',
        'timestamp',
        'url',
        'duration'
    ] as const;

    // Type-level check that we didn't forget to include any keys
    type A = TupleToUnion<typeof keys>;
    type B = keyof ReporterTestResult;

    const keysTypeChecked: B extends A ?
        A extends B ? typeof keys : never
        : never = keys;

    const updatedTestResult = _.assign({}, _.pick(original, keysTypeChecked) as ReporterTestResult, updates);

    return new ReporterTestAdapter(updatedTestResult);
};

export const extractErrorDetails = (testResult: ReporterTestResult): ErrorDetails | null => {
    const details = testResult.error?.details ?? null;

    if (details) {
        return {
            title: details.title || 'error details',
            data: details.data,
            filePath: `${ERROR_DETAILS_PATH}/${getDetailsFileName(
                testResult.imageDir, testResult.browserId, testResult.attempt
            )}`
        };
    }

    return null;
};

export const removeBufferFromImagesInfo = (imagesInfo: ImageInfoFull): ImageInfoFull => {
    const {diffImg} = imagesInfo as ImageInfoDiff;
    const newImagesInfo = _.clone(imagesInfo);

    if (isImageBufferData(diffImg)) {
        (newImagesInfo as ImageInfoDiff).diffImg = {...diffImg, buffer: Buffer.from('')};
    }

    return newImagesInfo;
};
