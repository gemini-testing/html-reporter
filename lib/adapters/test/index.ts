import {TestStatus} from '../../constants';
// import {ErrorDetails, ImageBase64, ImageFile, ImageInfoFull, TestError} from '../types';

// import {TestStatus} from '../../constants';
import type {ReporterTestResult} from '../../test-adapter';

export interface TestAdapter {
    // TODO: should describe all these fields ???
    readonly id: string;
    readonly file: string;
    readonly pending: boolean;
    readonly disabled: boolean;
    readonly silentSkip: boolean; // looks like I don't need this
    readonly skipReason: string;

    // readonly parent: TestAdapter | null;

    // TODO: must be always string
    readonly browserId?: string;
    // TODO: must be always string
    readonly browserVersion?: string;

    clone(): TestAdapter;

    fullTitle(): string;
    isSilentlySkipped(): boolean;
    formatTestResult(status: TestStatus, attempt?: number): ReporterTestResult;
}
