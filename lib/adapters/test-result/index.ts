import {TestStatus} from '../../constants';
import {ErrorDetails, ImageBase64, ImageFile, ImageInfoFull, TestError, TestStepCompressed, Attachment} from '../../types';

export interface ReporterTestResult {
    readonly attempt: number;
    readonly browserId: string;
    readonly description: string | undefined;
    readonly error: undefined | TestError;
    readonly errorDetails: ErrorDetails | null;
    readonly file: string;
    readonly fullName: string;
    readonly history: TestStepCompressed[];
    readonly id: string;
    readonly imageDir: string;
    readonly imagesInfo: ImageInfoFull[];
    readonly meta: {browserVersion?: string} & Record<string, unknown>;
    readonly multipleTabs: boolean;
    readonly screenshot: ImageBase64 | ImageFile | null | undefined;
    readonly sessionId: string;
    readonly skipReason?: string;
    readonly state: { name: string };
    readonly status: TestStatus;
    readonly testPath: string[];
    /** Test start timestamp in ms */
    readonly timestamp: number;
    readonly url?: string;
    /** Test duration in ms */
    readonly duration: number;
    readonly attachments: Attachment[];
}
