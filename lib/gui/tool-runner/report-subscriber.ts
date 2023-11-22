import os from 'os';
import PQueue from 'p-queue';
import Hermione from 'hermione';
import {ClientEvents} from '../constants';
import {getSuitePath} from '../../plugin-utils';
import {createWorkers, CreateWorkersRunner} from '../../workers/create-workers';
import {logError, formatTestResult} from '../../server-utils';
import {hasDiff} from '../../common-utils';
import {TestStatus, RUNNING, SUCCESS, SKIPPED} from '../../constants';
import {GuiReportBuilder} from '../../report-builder/gui';
import {EventSource} from '../event-source';
import {HermioneTestResult} from '../../types';
import {HermioneTestAdapter, ReporterTestResult} from '../../test-adapter';
import {ImageDiffError} from '../../errors';

let workers: ReturnType<typeof createWorkers>;

export const subscribeOnToolEvents = (hermione: Hermione, reportBuilder: GuiReportBuilder, client: EventSource, reportPath: string): void => {
    const queue = new PQueue({concurrency: os.cpus().length});
    const {imageHandler} = reportBuilder;

    async function failHandler(formattedResult: ReporterTestResult): Promise<void> {
        const actions: Promise<unknown>[] = [imageHandler.saveTestImages(formattedResult, workers)];

        if (formattedResult.errorDetails) {
            actions.push((formattedResult as HermioneTestAdapter).saveErrorDetails(reportPath));
        }

        await Promise.all(actions);
    }

    hermione.on(hermione.events.RUNNER_START, (runner) => {
        workers = createWorkers(runner as unknown as CreateWorkersRunner);
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
        const formattedResult = formatTestResult(data as HermioneTestResult, RUNNING, reportBuilder);
        formattedResult.attempt = reportBuilder.getCurrAttempt(formattedResult);

        reportBuilder.addRunning(formattedResult);
        const testBranch = reportBuilder.getTestBranch(formattedResult.id);

        return client.emit(ClientEvents.BEGIN_STATE, testBranch);
    });

    hermione.on(hermione.events.TEST_PASS, (testResult) => {
        queue.add(async () => {
            const formattedResult = formatTestResult(testResult, SUCCESS, reportBuilder);
            formattedResult.attempt = reportBuilder.getCurrAttempt(formattedResult);

            await imageHandler.saveTestImages(formattedResult, workers);
            reportBuilder.addSuccess(formattedResult);

            const testBranch = reportBuilder.getTestBranch(formattedResult.id);
            client.emit(ClientEvents.TEST_RESULT, testBranch);
        }).catch(logError);
    });

    hermione.on(hermione.events.RETRY, (testResult) => {
        queue.add(async () => {
            const status = hasDiff(testResult.assertViewResults as ImageDiffError[]) ? TestStatus.FAIL : TestStatus.ERROR;
            const formattedResult = formatTestResult(testResult, status, reportBuilder);
            formattedResult.attempt = reportBuilder.getCurrAttempt(formattedResult);

            await failHandler(formattedResult);
            reportBuilder.addRetry(formattedResult);

            const testBranch = reportBuilder.getTestBranch(formattedResult.id);
            client.emit(ClientEvents.TEST_RESULT, testBranch);
        }).catch(logError);
    });

    hermione.on(hermione.events.TEST_FAIL, (testResult) => {
        queue.add(async () => {
            const status = hasDiff(testResult.assertViewResults as ImageDiffError[]) ? TestStatus.FAIL : TestStatus.ERROR;
            const formattedResult = formatTestResult(testResult, status, reportBuilder);
            formattedResult.attempt = reportBuilder.getCurrAttempt(formattedResult);

            await failHandler(formattedResult);
            status === TestStatus.FAIL
                ? reportBuilder.addFail(formattedResult)
                : reportBuilder.addError(formattedResult);

            const testBranch = reportBuilder.getTestBranch(formattedResult.id);
            client.emit(ClientEvents.TEST_RESULT, testBranch);
        }).catch(logError);
    });

    hermione.on(hermione.events.TEST_PENDING, async (testResult) => {
        queue.add(async () => {
            const formattedResult = formatTestResult(testResult as HermioneTestResult, SKIPPED, reportBuilder);
            formattedResult.attempt = reportBuilder.getCurrAttempt(formattedResult);

            await failHandler(formattedResult);
            reportBuilder.addSkipped(formattedResult);

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
