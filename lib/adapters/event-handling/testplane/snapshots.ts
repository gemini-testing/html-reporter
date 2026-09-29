import fs from 'fs';
import path from 'path';
import {pipeline} from 'stream/promises';

import type {eventWithTime as RrwebEvent} from '@rrweb/types';
import makeDebug from 'debug';
import fsExtra from 'fs-extra';
import _ from 'lodash';
import type Testplane from 'testplane';
import type {TestContext, NetworkRequestsData} from 'testplane/unstable';

import {ReporterTestResult} from '../../test-result';
import {SNAPSHOTS_PATH} from '../../../constants';
import {AttachmentType, SnapshotAttachment, TestStepKey, SnapshotsSaver, SecretConfigFilter} from '../../../types';
import {EventSource} from '../../../gui/event-source';
import {ClientEvents} from '../../../gui/constants';
import {getTimeTravelModeEnumSafe} from '../../../server-utils';
import {maskSecret} from '../../../secret-config-filter';

const debug = makeDebug('html-reporter:event-handling:snapshots');

export interface SnapshotsData {
    rrwebSnapshots: RrwebEvent[];
}

type NetworkHeader = NetworkRequestsData['requests'][number]['headers'][number];

export const snapshotsInProgress: Record<string, RrwebEvent[]> = {};
const networkRequestsInProgress: Record<string, NetworkRequestsData> = {};

export const getSnapshotHashWithoutAttempt = (context: TestContext): string => {
    return `${context.testPath.join()}.${context.browserId}`;
};

interface CreateSnapshotFilePathParams {
    attempt: number;
    hash: string;
    browserId: string;
    timestamp: number;
}

export function createSnapshotFilePath({attempt: attemptInput, hash, browserId, timestamp}: CreateSnapshotFilePathParams): string {
    const attempt: number = attemptInput || 0;
    const snapshotDir = _.compact([SNAPSHOTS_PATH, hash]);
    const components = snapshotDir.concat(`${browserId}_${timestamp}_${attempt}.zip`);

    return path.join(...components);
}

export const handleDomSnapshotsEvent = (client: EventSource | null, context: TestContext, data: SnapshotsData): void => {
    try {
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

        if (client && rrwebSnapshotsNumbered.length) {
            client.emit(ClientEvents.DOM_SNAPSHOTS, {context, data: {rrwebSnapshots: rrwebSnapshotsNumbered}});
        }
    } catch (e) {
        console.warn(`Failed to handle DOM_SNAPSHOTS event for test "${context?.testPath?.join(' ')}.${context?.browserId}" in html-reporter due to an error.`, e);
    }
};

export const handleNetworkRequestsEvent = (context: TestContext, data: NetworkRequestsData): void => {
    const hash = getSnapshotHashWithoutAttempt(context);
    const requestsData = networkRequestsInProgress[hash] ||= {requests: []};
    requestsData.requests.push(...data.requests);
};

interface FinalizeSnapshotsParams {
    testResult: ReporterTestResult;
    attempt: number;
    timeTravelConfig: Testplane['config']['timeTravel'];
    reportPath: string;
    eventName: Testplane['events'][keyof Testplane['events']];
    events: Testplane['events'];
    snapshotsSaver?: SnapshotsSaver | null;
    secretConfigFilter: SecretConfigFilter | null;
}

export const finalizeSnapshotsForTest = async ({testResult, attempt, reportPath, timeTravelConfig, events, eventName, snapshotsSaver, secretConfigFilter}: FinalizeSnapshotsParams): Promise<SnapshotAttachment[]> => {
    try {
        const TimeTravelMode = getTimeTravelModeEnumSafe();
        const hash = getSnapshotHashWithoutAttempt(testResult);
        const snapshots = snapshotsInProgress[hash] || [];
        const networkData = networkRequestsInProgress[hash];

        delete snapshotsInProgress[hash];
        delete networkRequestsInProgress[hash];

        // Here we only check LastFailedRun, because in case of Off, we wouldn't even be here. LastFailedRun is the only case when we may want to not save snapshots.
        const shouldSave = TimeTravelMode && timeTravelConfig && (timeTravelConfig.mode !== TimeTravelMode.LastFailedRun || (eventName === events.TEST_FAIL));
        if (!shouldSave || (snapshots.length === 0 && !networkData?.requests.length)) {
            debug('Not saving snapshots for test "%s"', hash);
            debug('shouldSave evaluated to: %s', shouldSave, ', timeTravelConfig: ', timeTravelConfig, ', eventName: ', eventName);
            debug('snapshots: ', snapshots);
            return [];
        }

        if (testResult.history && testResult.history.length > 0 && snapshots.length > 0) {
            const firstSnapshotTime = snapshots[0].timestamp;
            const lastSnapshotTime = snapshots[snapshots.length - 1].timestamp;

            const firstHistoryTime = testResult.history[0][TestStepKey.TimeStart];
            const lastHistoryTime = Math.max(testResult.history[testResult.history.length - 1][TestStepKey.TimeStart], firstHistoryTime + testResult.duration);

            if (firstHistoryTime < firstSnapshotTime) {
                const fakeStartSnapshot: RrwebEvent & {seqNo?: number} = {
                    data: {id: 1, source: 3, x: 0, y: 0},
                    timestamp: firstHistoryTime,
                    type: 3,
                    seqNo: -1
                };
                snapshots.unshift(fakeStartSnapshot);
            }

            if (lastHistoryTime > lastSnapshotTime) {
                const fakeEndSnapshot: RrwebEvent & {seqNo?: number} = {
                    data: {id: 1, source: 3, x: 0, y: 0},
                    timestamp: lastHistoryTime,
                    type: 3,
                    seqNo: snapshots.length
                };
                snapshots.push(fakeEndSnapshot);
            }

            snapshots.forEach((snapshot, index) => {
                (snapshot as RrwebEvent & {seqNo: number}).seqNo = index;
            });
        }

        const snapshotsSerialized = snapshots.map(s => JSON.stringify(s)).join('\n');
        let maxWidth = 0, maxHeight = 0;
        for (const snapshot of snapshots) {
            if (snapshot.type !== 4) {
                continue;
            }
            if (snapshot.data.width > maxWidth) {
                maxWidth = snapshot.data.width;
            }
            if (snapshot.data.height > maxHeight) {
                maxHeight = snapshot.data.height;
            }
        }

        const zipFilePath = createSnapshotFilePath({
            attempt,
            hash: testResult.imageDir,
            browserId: testResult.browserId,
            timestamp: testResult.timestamp
        });
        const absoluteZipFilePath = path.resolve(reportPath, zipFilePath);
        await fsExtra.ensureDir(path.dirname(absoluteZipFilePath));

        const {default: yazl} = await import('yazl');
        const zipfile = new yazl.ZipFile();
        const output = fs.createWriteStream(absoluteZipFilePath);
        zipfile.on('error', error => output.destroy(error));
        const written = pipeline(zipfile.outputStream, output);

        zipfile.addBuffer(Buffer.from(snapshotsSerialized), 'snapshots.json');
        if (networkData?.requests.length) {
            const bodiesMap: Record<string, string> = {};
            const maskHeaderValues = (header: NetworkHeader): NetworkHeader => ({
                name: header.name,
                value: maskSecret(header.value, `network-request.header.${header.name}`, secretConfigFilter)
            });
            const requestsWithResolvedBodyPaths = networkData.requests.map(request => {
                const resultingRequest = {...request};

                resultingRequest.headers = resultingRequest.headers.map(maskHeaderValues);
                if (resultingRequest.response) {
                    resultingRequest.response = {
                        ...resultingRequest.response,
                        headers: resultingRequest.response.headers.map(maskHeaderValues)
                    };
                }

                if (request.bodyHash && request.bodyFilePath) {
                    bodiesMap[request.bodyHash] = request.bodyFilePath;
                    resultingRequest.bodyFilePath = `network/bodies/${request.bodyHash}`;
                }

                const response = resultingRequest.response;
                if (response?.bodyHash && response.bodyFilePath) {
                    bodiesMap[response.bodyHash] = response.bodyFilePath;
                    resultingRequest.response = {
                        ...response,
                        bodyFilePath: `network/bodies/${response.bodyHash}`
                    };
                }

                return resultingRequest;
            });

            zipfile.addBuffer(Buffer.from(JSON.stringify({version: 1, requests: requestsWithResolvedBodyPaths})), 'network.json');
            for (const [hash, bodyPath] of Object.entries(bodiesMap)) {
                zipfile.addFile(bodyPath, `network/bodies/${hash}`);
            }
        }
        zipfile.end();
        await written;

        let savedPath = zipFilePath;
        if (snapshotsSaver) {
            try {
                savedPath = await snapshotsSaver.saveSnapshot(absoluteZipFilePath, {
                    destPath: zipFilePath,
                    reportDir: reportPath
                });
            } catch (e) {
                console.warn(`Failed to save snapshot using custom saver for test "${testResult?.testPath?.join(' ')}.${testResult?.browserId}" (local path will be used): ${e}`);
            }
        }

        return [{type: AttachmentType.Snapshot, path: savedPath, maxWidth, maxHeight}];
    } catch (e) {
        console.warn(`Failed to finalize DOM snapshots for test "${testResult?.testPath?.join(' ')}.${testResult?.browserId}" in html-reporter due to an error.`, e);
        return [];
    }
};
