import os from 'os';
import PQueue from 'p-queue';
import Hermione from 'hermione';
import {ClientEvents} from '../constants';
import {getSuitePath} from '../../plugin-utils';
import {createWorkers, CreateWorkersRunner} from '../../workers/create-workers';
import {logError, formatTestResult} from '../../server-utils';
import {hasFailedImages} from '../../common-utils';
import {TestStatus, RUNNING, SUCCESS, SKIPPED, UNKNOWN_ATTEMPT} from '../../constants';
import {GuiReportBuilder} from '../../report-builder/gui';
import {EventSource} from '../event-source';
import {HermioneTestResult, ImageInfoFull} from '../../types';

export const subscribeOnToolEvents = (hermione: Hermione, reportBuilder: GuiReportBuilder, client: EventSource): void => {
    const queue = new PQueue({concurrency: os.cpus().length});

    hermione.on(hermione.events.RUNNER_START, (runner) => {
        reportBuilder.registerWorkers(createWorkers(runner as unknown as CreateWorkersRunner));
    });

    hermione.on(hermione.events.SUITE_BEGIN, (suite) => {
        if (suite.pending) {
            return;
        }

        client.emit(ClientEvents.BEGIN_SUITE, {
            suiteId: getSuitePath(suite).join(' '),
            status: TestStatus.RUNNING
        });
    });

    hermione.on(hermione.events.TEST_BEGIN, (data) => {
        queue.add(async () => {
            const formattedResultWithoutAttempt = formatTestResult(data as HermioneTestResult, RUNNING, UNKNOWN_ATTEMPT);

            const formattedResult = await reportBuilder.addTestResult(formattedResultWithoutAttempt);
            const testBranch = reportBuilder.getTestBranch(formattedResult.id);

            return client.emit(ClientEvents.BEGIN_STATE, testBranch);
        });
    });

    hermione.on(hermione.events.TEST_PASS, (testResult) => {
        queue.add(async () => {
            const formattedResultWithoutAttempt = formatTestResult(testResult, SUCCESS, UNKNOWN_ATTEMPT);

            const formattedResult = await reportBuilder.addTestResult(formattedResultWithoutAttempt);

            const testBranch = reportBuilder.getTestBranch(formattedResult.id);
            client.emit(ClientEvents.TEST_RESULT, testBranch);
        }).catch(logError);
    });

    hermione.on(hermione.events.RETRY, (testResult) => {
        queue.add(async () => {
            const status = hasFailedImages(testResult.assertViewResults as ImageInfoFull[]) ? TestStatus.FAIL : TestStatus.ERROR;

            const formattedResultWithoutAttempt = formatTestResult(testResult, status, UNKNOWN_ATTEMPT);

            const formattedResult = await reportBuilder.addTestResult(formattedResultWithoutAttempt);

            const testBranch = reportBuilder.getTestBranch(formattedResult.id);
            client.emit(ClientEvents.TEST_RESULT, testBranch);
        }).catch(logError);
    });

    hermione.on(hermione.events.TEST_FAIL, (testResult) => {
        queue.add(async () => {
            const status = hasFailedImages(testResult.assertViewResults as ImageInfoFull[]) ? TestStatus.FAIL : TestStatus.ERROR;

            const formattedResultWithoutAttempt = formatTestResult(testResult, status, UNKNOWN_ATTEMPT);

            const formattedResult = await reportBuilder.addTestResult(formattedResultWithoutAttempt);

            const testBranch = reportBuilder.getTestBranch(formattedResult.id);
            client.emit(ClientEvents.TEST_RESULT, testBranch);
        }).catch(logError);
    });

    hermione.on(hermione.events.TEST_PENDING, async (testResult) => {
        queue.add(async () => {
            const formattedResultWithoutAttempt = formatTestResult(testResult as HermioneTestResult, SKIPPED, UNKNOWN_ATTEMPT);

            const formattedResult = await reportBuilder.addTestResult(formattedResultWithoutAttempt);

            const testBranch = reportBuilder.getTestBranch(formattedResult.id);
            client.emit(ClientEvents.TEST_RESULT, testBranch);
        }).catch(logError);
    });

    hermione.on(hermione.events.RUNNER_END, async () => {
        try {
            await queue.onIdle();
            client.emit(ClientEvents.END);
        } catch (err: unknown) {
            logError(err as Error);
        }
    });
};
