import stringify from 'json-stringify-safe';
import ipc from './ipc';
import {ClientEvents} from '../../../gui/constants';

import type {Reporter, TestCase} from '@playwright/test/reporter';
import type {TestResultWithGuiStatus} from '../../test-result/playwright';

export type PwtEventMessage = {
    test: TestCase;
    result: TestResultWithGuiStatus;
    browserName: string;
    titlePath: string[];
};

export default class MyReporter implements Reporter {
    onTestBegin(test: TestCase, result: TestResultWithGuiStatus): void {
        ipc.emit(ClientEvents.BEGIN_STATE, getEmittedData(test, result));
    }

    onTestEnd(test: TestCase, result: TestResultWithGuiStatus): void {
        ipc.emit(ClientEvents.TEST_RESULT, getEmittedData(test, result));
    }

    onEnd(): void {
        ipc.emit(ClientEvents.END);
    }
}

function getEmittedData(test: TestCase, result: TestResultWithGuiStatus): PwtEventMessage {
    return {
        test: JSON.parse(stringify(test)),
        result: JSON.parse(stringify(result)),
        browserName: test.parent.project()?.name || '',
        titlePath: test.titlePath()
    };
}
