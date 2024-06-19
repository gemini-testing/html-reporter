// TODO: use test adapter instead of unknown
import type {TestAdapter} from '../test';
// import type {Test} from 'testplane';

export type TestsCallback<T = void> = (test: TestAdapter, browserId: string) => T;

export interface TestCollectionAdapter {
    // TODO: write Test Adapter for this case
    eachTest(cb: TestsCallback): void;

    // enableAll(): this;
    // disableAll(): this;

    // enableTest(testName: string, browserName: string): this;
    // disableTest(testName: string, browserName: string): this;

    // readonly attempt: number;
    // readonly browserId: string;
    // readonly description: string | undefined;
    // readonly error: undefined | TestError;
    // readonly errorDetails: ErrorDetails | null;
    // readonly file: string;
    // readonly fullName: string;
    // readonly history: string[];
    // readonly id: string;
    // readonly imageDir: string;
    // readonly imagesInfo: ImageInfoFull[];
    // readonly meta: {browserVersion?: string} & Record<string, unknown>;
    // readonly multipleTabs: boolean;
    // readonly screenshot: ImageBase64 | ImageFile | null | undefined;
    // readonly sessionId: string;
    // readonly skipReason?: string;
    // readonly state: { name: string };
    // readonly status: TestStatus;
    // readonly testPath: string[];
    // readonly timestamp: number | undefined;
    // readonly url?: string;
}
