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
    }
}

export interface TestAdapter {
    readonly id: string;
    readonly pending: boolean;
    readonly disabled: boolean;
    readonly browserId: string;
    readonly file: string;
    readonly title: string;
    readonly titlePath: string[];

    clone(): TestAdapter;
    fullTitle(): string;
    isSilentlySkipped(): boolean;
    // TODO: rename to mkTestResult ???
    createTestResult(opts: CreateTestResultOpts): ReporterTestResult;
}
