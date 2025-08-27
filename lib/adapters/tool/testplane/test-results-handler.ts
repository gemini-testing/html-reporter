import os from 'os';
import PQueue from 'p-queue';
import type {Test as TestplaneTest} from 'testplane';
import {ClientEvents} from '../../../gui/constants';
import {getSuitePath} from '../../../plugin-utils';
import {createWorkers, CreateWorkersRunner} from '../../../workers/create-workers';
import {logError, formatTestResult} from '../../../server-utils';
import {TestStatus, UNKNOWN_ATTEMPT} from '../../../constants';
import {GuiReportBuilder} from '../../../report-builder/gui';
import {EventSource} from '../../../gui/event-source';
import {Attachment, TestplaneTestResult} from '../../../types';
import {TestplaneWithHtmlReporter} from '../../tool/testplane/index';
import {copyAndUpdate} from '../../test-result/utils';

export const handleTestResults = (testplane: TestplaneWithHtmlReporter, reportBuilder: GuiReportBuilder, client: EventSource): void => {
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
                const {getStatus} = await import('../../test-result/testplane');
                const {finalizeSnapshotsForTest} = await import('../../event-handling/testplane/snapshots');
                const status = getStatus(eventName, testplane.events, data as TestplaneTestResult);
                const formattedResultWithoutAttempt = formatTestResult(
                    data,
                    status,
                    UNKNOWN_ATTEMPT,
                    testplane.config.saveHistoryMode
                );

                const attachments: Attachment[] = [];
                if (eventName !== testplane.events.TEST_BEGIN) {
                    // By this time an attempt had already been created for "running" test result, so here we have current attempt number
                    const attempt = reportBuilder.getLatestAttempt({fullName: formattedResultWithoutAttempt.fullName, browserId: formattedResultWithoutAttempt.browserId});
                    const snapshotAttachments = await finalizeSnapshotsForTest({
                        testResult: formattedResultWithoutAttempt,
                        attempt,
                        reportPath: testplane.htmlReporter.config.path,
                        events: testplane.events,
                        eventName,
                        timeTravelConfig: testplane.config.timeTravel,
                        snapshotsSaver: testplane.htmlReporter.snapshotsSaver
                    });

                    attachments.push(...snapshotAttachments);
                }

                const formattedResultWithAttachments = copyAndUpdate(formattedResultWithoutAttempt, {attachments});
                const formattedResult = await reportBuilder.addTestResult(formattedResultWithAttachments);

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

    testplane.on(testplane.events.DOM_SNAPSHOTS, (context, data) => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const {handleDomSnapshotsEvent} = require('../../event-handling/testplane/snapshots');
        handleDomSnapshotsEvent(client, context, data);
    });
};
