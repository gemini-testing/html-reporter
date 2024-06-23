import {TestStatus} from '../../constants';
import type {ReporterTestResult} from '../test-result';

export interface TestAdapter {
    readonly id: string;
    readonly pending: boolean;
    readonly disabled: boolean;
    readonly browserId: string;

    clone(): TestAdapter;
    fullTitle(): string;
    isSilentlySkipped(): boolean;
    formatTestResult(status: TestStatus, attempt?: number): ReporterTestResult;
}
