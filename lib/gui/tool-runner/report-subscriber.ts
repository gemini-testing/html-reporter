import os from 'os';
import PQueue from 'p-queue';
import Hermione, {Test as HermioneTest} from 'hermione';
import {ClientEvents} from '../constants';
import {getSuitePath} from '../../plugin-utils';
import {createWorkers, CreateWorkersRunner} from '../../workers/create-workers';
import {logError, formatTestResult} from '../../server-utils';
import {TestStatus} from '../../constants';
import {GuiReportBuilder} from '../../report-builder/gui';
import {EventSource} from '../event-source';
import {HermioneTestResult} from '../../types';
import {getStatus} from '../../test-adapter/hermione';

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

    [
        {eventName: hermione.events.TEST_BEGIN, clientEventName: ClientEvents.BEGIN_STATE},
        {eventName: hermione.events.TEST_PASS, clientEventName: ClientEvents.TEST_RESULT},
        {eventName: hermione.events.RETRY, clientEventName: ClientEvents.TEST_RESULT},
        {eventName: hermione.events.TEST_FAIL, clientEventName: ClientEvents.TEST_RESULT},
        {eventName: hermione.events.TEST_PENDING, clientEventName: ClientEvents.TEST_RESULT}
    ].forEach(({eventName, clientEventName}) => {
        type AnyHermioneTestEvent = typeof hermione.events.TEST_PASS;

        hermione.on(eventName as AnyHermioneTestEvent, (data: HermioneTest | HermioneTestResult) => {
            queue.add(async () => {
                const status = getStatus(eventName, hermione.events, data as HermioneTestResult);
                const formattedResultWithoutAttempt = formatTestResult(data, status);

                const formattedResult = await reportBuilder.addTestResult(formattedResultWithoutAttempt);
                const testBranch = reportBuilder.getTestBranch(formattedResult.id);

                return client.emit(clientEventName, testBranch);
            }).catch(logError);
        });
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
