import _ from 'lodash';
import {ReporterTestResult} from '../index';
import {TupleToUnion} from 'type-fest';

export const copyAndUpdate = (original: ReporterTestResult, updates: Partial<ReporterTestResult>): ReporterTestResult => {
    const keys = [
        'assertViewResults',
        'attempt',
        'browserId',
        'description',
        'error',
        'errorDetails',
        'file',
        'fullName',
        'history',
        'id',
        'image',
        'imageDir',
        'imagesInfo',
        'isUpdated',
        'meta',
        'multipleTabs',
        'screenshot',
        'sessionId',
        'skipReason',
        'state',
        'status',
        'testPath',
        'timestamp',
        'url'
    ] as const;

    // Type-level check that we didn't forget to include any keys
    type A = TupleToUnion<typeof keys>;
    type B = keyof ReporterTestResult;

    const keysTypeChecked: B extends A ?
        B extends A ? typeof keys : never
        : never = keys;

    return _.assign({}, _.pick(original, keysTypeChecked) as ReporterTestResult, updates);
};
