import os from 'os';
import PQueue from 'p-queue';
import type Testplane from 'testplane';
import type {Test as TestplaneTest} from 'testplane';
import {ClientEvents} from '../../../gui/constants';
import {getSuitePath} from '../../../plugin-utils';
import {createWorkers, CreateWorkersRunner} from '../../../workers/create-workers';
import {logError, formatTestResult} from '../../../server-utils';
import {TestStatus} from '../../../constants';
import {GuiReportBuilder} from '../../../report-builder/gui';
import {EventSource} from '../../../gui/event-source';
import {TestplaneTestResult} from '../../../types';
import {getStatus} from '../../../test-adapter/testplane';

export const handleTestResults = (testplane: Testplane, reportBuilder: GuiReportBuilder, client: EventSource): void => {
    const queue = new PQueue({concurrency: os.cpus().length});

    testplane.on(testplane.events.RUNNER_START, (runner) => {
        reportBuilder.registerWorkers(createWorkers(runner as unknown as CreateWorkersRunner));
    });

    testplane.on(testplane.events.SUITE_BEGIN, (suite) => {
        if (suite.pending) {
            return;
        }

        client.emit(ClientEvents.BEGIN_SUITE, {
            suiteId: getSuitePath(suite).join(' '),
            status: TestStatus.RUNNING
        });
    });

    [
        {eventName: testplane.events.TEST_BEGIN, clientEventName: ClientEvents.BEGIN_STATE},
        {eventName: testplane.events.TEST_PASS, clientEventName: ClientEvents.TEST_RESULT},
        {eventName: testplane.events.RETRY, clientEventName: ClientEvents.TEST_RESULT},
        {eventName: testplane.events.TEST_FAIL, clientEventName: ClientEvents.TEST_RESULT},
        {eventName: testplane.events.TEST_PENDING, clientEventName: ClientEvents.TEST_RESULT}
    ].forEach(({eventName, clientEventName}) => {
        type AnyTestplaneTestEvent = typeof testplane.events.TEST_PASS;

        testplane.on(eventName as AnyTestplaneTestEvent, (data: TestplaneTest | TestplaneTestResult) => {
            queue.add(async () => {
                const status = getStatus(eventName, testplane.events, data as TestplaneTestResult);
                const formattedResultWithoutAttempt = formatTestResult(data, status);

                const formattedResult = await reportBuilder.addTestResult(formattedResultWithoutAttempt);
                const testBranch = reportBuilder.getTestBranch(formattedResult.id);

                return client.emit(clientEventName, testBranch);
            }).catch(logError);
        });
    });

    testplane.on(testplane.events.RUNNER_END, async () => {
        try {
            await queue.onIdle();
            client.emit(ClientEvents.END);
        } catch (err: unknown) {
            logError(err as Error);
        }
    });
};
