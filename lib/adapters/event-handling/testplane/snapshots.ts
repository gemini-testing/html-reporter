import fs from 'fs';
import path from 'path';

import type {eventWithTime as RrwebEvent} from '@rrweb/types';
import fsExtra from 'fs-extra';
import _ from 'lodash';
import type Testplane from 'testplane';
import {RecordMode} from 'testplane';
import yazl from 'yazl';

import {ReporterTestResult} from '../../test-result';
import {SNAPSHOTS_PATH} from '../../../constants';
import {AttachmentType, SnapshotAttachment} from '../../../types';
import {EventSource} from '../../../gui/event-source';
import {ClientEvents} from '../../../gui/constants';

export interface TestContext {
    testPath: string[];
    browserId: string;
}

export interface SnapshotsData {
    rrwebSnapshots: RrwebEvent[];
}

export const snapshotsInProgress: Record<string, RrwebEvent[]> = {};

export const getSnapshotHashWithoutAttempt = (context: TestContext): string => {
    return `${context.testPath.join()}.${context.browserId}`;
};

interface CreateSnapshotFilePathParams {
    attempt: number;
    hash: string;
    browserId: string;
}

export function createSnapshotFilePath({attempt: attemptInput, hash, browserId}: CreateSnapshotFilePathParams): string {
    const attempt: number = attemptInput || 0;
    const imageDir = _.compact([SNAPSHOTS_PATH, hash]);
    const components = imageDir.concat(`${browserId}_${attempt}.zip`);

    return path.join(...components);
}

export const handleDomSnapshotsEvent = (client: EventSource | null, context: TestContext, data: SnapshotsData): void => {
    const hash = getSnapshotHashWithoutAttempt(context);
    if (!snapshotsInProgress[hash]) {
        snapshotsInProgress[hash] = [];
    }

    // We need to number snapshots during live streaming for a case when user switches in UI to some test while it's running
    // In this case we need to merge 2 parts: snapshots that were taken before user switched and ones that we receive live
    // Since they can overlap, we introduce sequence numbering to guarantee smooth experience
    let seqNo = snapshotsInProgress[hash].length;
    const rrwebSnapshotsNumbered = data.rrwebSnapshots.map(snapshot => Object.assign({}, snapshot, {seqNo: seqNo++}));

    snapshotsInProgress[hash].push(...rrwebSnapshotsNumbered);

    if (client) {
        client.emit(ClientEvents.DOM_SNAPSHOTS, {context, data: {rrwebSnapshots: rrwebSnapshotsNumbered}});
    }
};

interface FinalizeSnapshotsParams {
    testResult: ReporterTestResult;
    attempt: number;
    recordConfig: Testplane['config']['record'];
    reportPath: string;
    eventName: Testplane['events'][keyof Testplane['events']];
    events: Testplane['events'];
}

export const finalizeSnapshotsForTest = async ({testResult, attempt, reportPath, recordConfig, events, eventName}: FinalizeSnapshotsParams): Promise<SnapshotAttachment[]> => {
    const hash = getSnapshotHashWithoutAttempt(testResult);
    const snapshots = snapshotsInProgress[hash];

    delete snapshotsInProgress[hash];

    if (!snapshots || snapshots.length === 0) {
        console.warn(`No snapshots found for test hash: ${hash}`);
        return [];
    }

    const shouldSave = recordConfig.mode !== RecordMode.SaveLastFailedRun || (eventName === events.TEST_FAIL);
    if (!shouldSave) {
        return [];
    }

    const snapshotsSerialized = snapshots.map(s => JSON.stringify(s)).join('\n');

    const zipFilePath = createSnapshotFilePath({attempt, hash: testResult.imageDir, browserId: testResult.browserId});
    const absoluteZipFilePath = path.resolve(reportPath, zipFilePath);
    await fsExtra.ensureDir(path.dirname(absoluteZipFilePath));

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let done = (_attachments: SnapshotAttachment[]): void => {};
    const resultPromise = new Promise<SnapshotAttachment[]>((resolve) => {
        done = resolve;
    });

    const zipfile = new yazl.ZipFile();
    const output = fs.createWriteStream(absoluteZipFilePath);
    zipfile.outputStream.pipe(output).on('close', () => {
        done([{
            type: AttachmentType.Snapshot,
            path: zipFilePath
        }]);
    });

    zipfile.addBuffer(Buffer.from(snapshotsSerialized), 'snapshots.json');

    zipfile.end();

    return resultPromise;
};
