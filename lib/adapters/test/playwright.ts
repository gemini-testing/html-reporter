import _ from 'lodash';
import type {TestCase, TestResult} from '@playwright/test/reporter';

import {PlaywrightTestAdapter} from '../../test-adapter/playwright';
import {TestStatus, UNKNOWN_ATTEMPT, PWT_TITLE_DELIMITER} from '../../constants';

import type {TestAdapter} from './index';
import type {ReporterTestResult} from '../../test-adapter';

export type PwtTest = {
    file: string;
    browserName: string;
    title: string;
}

// TODO: add Adapter
// TODO: should implement parent field ???
export class PlaywrightTest implements TestAdapter {
    private _test: PwtTest;

    static create<T extends PlaywrightTest>(this: new (test: PwtTest) => T, test: PwtTest): T {
        return new this(test);
    }

    constructor(test: PwtTest) {
        this._test = test;
    }

    get originalTest(): PwtTest {
        return this._test;
    }

    get id(): string {
        return this._test.title + '_' + this._test.browserName;
    }

    get file(): string {
        return this._test.file;
    }

    get pending(): boolean {
        return false;
        // return this._test.pending;
    }

    get disabled(): boolean {
        return false;
        // return this._test.disabled;
    }

    get silentSkip(): boolean {
        return false;
        // return this._test.silentSkip;
    }

    get skipReason(): string {
        return '';
        // return this._test.skipReason;
    }

    get browserId(): string {
        return this._test.browserName;
    }

    get browserVersion(): string {
        return '';
    }

    fullTitle(): string {
        return this._test.title;
    }

    // disableTest(): void {
    //     this._test.disabled = true;
    // }

    // enableTest(): void {
    //     this._test.disabled = false;
    // }

    clone(): PlaywrightTest {
        // TODO: should use something else instead _clone ???
        return PlaywrightTest.create(_.clone(this._test));
    }

    isSilentlySkipped(runnable = this._test): boolean {
        console.log('isSilentlySkipped, runnable:', runnable);

        return false;
        // return Boolean(runnable.silentSkip || runnable.parent && this.isSilentlySkipped(runnable.parent));
    }

    formatTestResult(status: TestStatus, attempt: number = UNKNOWN_ATTEMPT): ReporterTestResult {
        console.log('formatTestResult, status:', status);

        const testCase = {
            titlePath: () => ['', '', '', ...this._test.title.split(PWT_TITLE_DELIMITER)],
            title: this._test.title,
            annotations: [],
            location: {
                file: this._test.file
            },
            parent: {
                project: () => ({
                    name: this._test.browserName
                })
            }
        };
        console.log('testCase:', testCase);

        const result = {
            attachments: [],
            steps: [],
            startTime: new Date()
        } as unknown as TestResult;
        console.log('result:', result);

        // TODO: should send status
        return new PlaywrightTestAdapter(testCase as unknown as TestCase, result, attempt);
    }
}

// export const formatTestResult = (
//     rawResult: PlaywrightTest | PlaywrightTestResult,
//     status: TestStatus,
//     attempt: number = UNKNOWN_ATTEMPT
// ): ReporterTestResult => {
//     return new PlaywrightTestAdapter(rawResult, {attempt, status});
// };
