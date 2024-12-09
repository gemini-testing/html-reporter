import {TestStatus} from '../../constants';
import type {ReporterTestResult} from '../test-result';
import type {AssertViewResult} from '../../types';

export interface CreateTestResultOpts {
    status: TestStatus;
    attempt?: number;
    assertViewResults?: AssertViewResult[];
    error?: Error;
    sessionId?: string;
    meta?: {
        url?: string;
    };
    duration: number;
}

export interface TestAdapter {
    readonly id: string;
    readonly pending: boolean;
    readonly disabled: boolean;
    readonly silentlySkipped: boolean;
    readonly browserId: string;
    readonly fullName: string;
    readonly file: string;
    readonly titlePath: string[];

    createTestResult(opts: CreateTestResultOpts): ReporterTestResult;
}
