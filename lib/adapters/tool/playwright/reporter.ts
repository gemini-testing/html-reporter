// import os from 'node:os';
// import PQueue from 'p-queue';
import stringify from 'json-stringify-safe';

// import {PlaywrightTestAdapter} from '../../../test-adapter/playwright';
// import {getStatus} from '../../../test-adapter/playwright';
import {ClientEvents} from '../../../gui/constants';
import {TestStatus} from '../../../constants';
import type {
    FullConfig, FullResult, Reporter, Suite, TestCase, TestResult
} from '@playwright/test/reporter';
// import execa from 'execa';

process.on('message', (m) => {
    console.log('CHILD got message:', m);
});

class MyReporter implements Reporter {
    // private _queue: PQueue;

    // constructor() {
    //     this._queue = new PQueue({concurrency: os.cpus().length});
    // }

    onBegin(_config: FullConfig, suite: Suite): void {
        console.log('onBegin, suite:', suite);
        console.log('onBegin, suite.title:', suite.title);

        process.send!({
            event: ClientEvents.BEGIN_SUITE,
            suiteId: suite.title,
            status: TestStatus.RUNNING
        });
    }

    onTestBegin(test: TestCase, result: TestResult): void {
        // console.log(`Starting test ${test}`);
        // console.log(`Starting _result ${result}`);

        // this._queue.add(async () => {
        // const status = getStatus(result);
        // console.log('onTestBegin, status:', status);

        // const formattedResultWithoutAttempt = new PlaywrightTestAdapter(test, result, UNKNOWN_ATTEMPT);
        // console.log('formattedResultWithoutAttempt:', formattedResultWithoutAttempt);

        process.send!({
            event: ClientEvents.BEGIN_STATE,
            test: stringify(test),
            result: stringify(result),
            browserName: test.parent.project()?.name
            // suiteId: suite.title,
            // status: TestStatus.RUNNING
        });
        // });
    }

    onTestEnd(test: TestCase, result: TestResult): void {
        console.log(`Finished test ${test.title}: ${result.status}`);

        process.send!({
            event: ClientEvents.TEST_RESULT,
            test: stringify(test),
            result: stringify(result),
            browserName: test.parent.project()?.name
            // suiteId: suite.title,
            // status: TestStatus.RUNNING
        });
    }

    async onEnd(result: FullResult): Promise<void> {
        console.log(`Finished the run: ${result.status}`);

        try {
            // await this._queue.onIdle();
            process.send!({event: ClientEvents.END});
            // client.emit(ClientEvents.END);
        } catch (err: unknown) {
            // TODO: send to master
            console.log(err as Error);
        }
    }
}

export default MyReporter;
