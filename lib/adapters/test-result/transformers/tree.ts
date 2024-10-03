import {ReporterTestResult} from '../index';
import _ from 'lodash';
import {BaseTreeTestResult} from '../../../tests-tree-builder/base';
import {DbTestResultTransformer} from './db';

interface Options {
    baseHost?: string;
}

export class TreeTestResultTransformer {
    private _transformer: DbTestResultTransformer;

    constructor(options: Options) {
        this._transformer = new DbTestResultTransformer(options);
    }

    transform(testResult: ReporterTestResult): BaseTreeTestResult {
        const result = this._transformer.transform(testResult);

        return {
            ..._.omit(result, 'imagesInfo'),
            attempt: testResult.attempt,
            errorDetails: testResult.errorDetails
        };
    }
}
