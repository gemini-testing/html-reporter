import _ from 'lodash';
import {ReporterTestResult} from '../index';

export const copyAndUpdate = (original: ReporterTestResult, updates: Partial<ReporterTestResult>): ReporterTestResult =>
    _.assign({}, original, updates);
