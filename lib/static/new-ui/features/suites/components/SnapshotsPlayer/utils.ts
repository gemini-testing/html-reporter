import {useCallback, useEffect, useRef, useState} from 'react';
import {unzip} from 'fflate';
import {ResultEntity} from '@/static/new-ui/types/store';
import {useEventSource} from '@/static/new-ui/providers/event-source';
import {TestContext} from '@/adapters/event-handling/testplane/snapshots';
import {isEqual} from 'lodash';
import {ClientEvents} from '@/gui/constants';
import {NumberedSnapshot} from './types';

/** Returns scale that element must be to fit inside the container, but no more than 1. */
export const useScaleToFit = (container: HTMLElement | null, getElementToFit = (container: HTMLElement): HTMLElement | null => container.querySelector('iframe')): number => {
    const [scaleFactor, setScaleFactor] = useState(1);

    useEffect(() => {
        if (!container) {
            return;
        }

        const resizeObserver = new ResizeObserver((entries) => {
            if (entries.length === 0) {
                return;
            }

            const entry = entries[0];
            const availableWidth = entry.contentRect.width;
            const availableHeight = entry.contentRect.height;

            const elementToFit = getElementToFit(container);
            if (!elementToFit) {
                return;
            }
            const elementWidth = elementToFit.clientWidth;
            const elementHeight = elementToFit.clientHeight;

            const newScaleFactor = Math.min(availableWidth / elementWidth, availableHeight / elementHeight, 1);
            setScaleFactor(isNaN(newScaleFactor) ? 1 : newScaleFactor);
        });
        resizeObserver.observe(container);

        return (): void => {
            resizeObserver.disconnect();
        };
    }, [container]);

    return scaleFactor;
};

const unzipSnapshots = (zipArrayBuffer: ArrayBuffer, zipUrl: string): Promise<NumberedSnapshot[]> => {
    return new Promise<NumberedSnapshot[]>((resolve, reject) => {
        unzip(new Uint8Array(zipArrayBuffer), (err, files) => {
            if (err) {
                return reject(err);
            }

            const snapshotsFile = files['snapshots.json'];
            if (!snapshotsFile) {
                return reject(new Error(`Couldn't find snapshots.json in ${zipUrl}. Most likely the snapshots file is corrupted.`));
            }

            const decoder = new TextDecoder('utf-8');
            const jsonlContent = decoder.decode(snapshotsFile);
            const snapshots = jsonlContent
                .split('\n')
                .filter(line => line.trim() !== '')
                .map(line => JSON.parse(line) as NumberedSnapshot);

            resolve(snapshots);
        });
    });
};

interface LoadSnapshotsFromZipOptions {
    abortSignal?: AbortSignal;
    onDownloadProgress?: (progressPercent: number) => void;
}

export const loadSnapshotsFromZip = async (zipUrl: string, {abortSignal, onDownloadProgress}: LoadSnapshotsFromZipOptions): Promise<NumberedSnapshot[]> => {
    const response = await fetch(zipUrl, {signal: abortSignal});
    if (!response.ok) {
        throw new Error([
            `Failed to fetch zip with snapshots by URL: ${zipUrl}.`,
            `Received status: ${response.statusText}.`
        ].join('\n\n'));
    }

    const contentLengthHeader = response.headers.get('Content-Length');
    let totalSize: number | null = null;
    if (contentLengthHeader) {
        const parsed = parseInt(contentLengthHeader, 10);
        if (!isNaN(parsed) && parsed > 0) {
            totalSize = parsed;
        }
    }

    const reader = response.body?.getReader();
    if (!reader) {
        // Fallback if the environment doesn’t support streaming, do normal .blob() with no progress
        const zipBlob = await response.blob();
        const zipArrayBuffer = await zipBlob.arrayBuffer();

        return unzipSnapshots(zipArrayBuffer, zipUrl);
    }

    let received = 0;
    const chunks: Uint8Array[] = [];

    // eslint-disable-next-line no-constant-condition
    while (true) {
        const {done, value} = await reader.read();
        if (done) {
            // No more data
            break;
        }
        if (value) {
            chunks.push(value);
            received += value.length;

            if (totalSize && onDownloadProgress) {
                const percent = (received / totalSize) * 100;
                onDownloadProgress(Math.min(percent, 100));
            }
        }
    }

    const zipBlob = new Blob(chunks);

    const zipArrayBuffer = await zipBlob.arrayBuffer();

    return unzipSnapshots(zipArrayBuffer, zipUrl);
};

export const useLiveSnapshotsStream = (currentResult: ResultEntity | null, onSnapshotsReceive: (snapshots: NumberedSnapshot[]) => unknown): () => void => {
    const eventSource = useEventSource();
    const queuedSnapshots = useRef<NumberedSnapshot[]>([]);
    const isStreamStarted = useRef(false);
    const areSnapshotsLoaded = useRef(false);

    const handleLiveSnapshotEvent = (e: MessageEvent): void => {
        if (!currentResult) {
            return;
        }

        try {
            const {context, data: {rrwebSnapshots}} = JSON.parse(e.data) as {context: TestContext, data: {rrwebSnapshots: NumberedSnapshot[]}};
            if (!isEqual(context.testPath, currentResult.suitePath) || context.browserId !== currentResult.name) {
                // These snapshots are for another test
                return;
            }
            if (isStreamStarted.current) {
                onSnapshotsReceive(rrwebSnapshots);
            } else {
                queuedSnapshots.current.push(...rrwebSnapshots);
            }
        } catch (error) {
            console.error('Error parsing snapshot event:', error);
        }
    };

    useEffect(() => {
        if (!currentResult || !eventSource) {
            return;
        }

        eventSource.addEventListener(ClientEvents.DOM_SNAPSHOTS, handleLiveSnapshotEvent);

        const queryParams = new URLSearchParams({
            testPath: JSON.stringify(currentResult.suitePath),
            browserId: currentResult.name
        }).toString();

        fetch(`/running-test-data?${queryParams}`).then(response => {
            if (!response.ok) {
                throw new Error(`Failed to fetch snapshots: ${response.statusText}`);
            }

            return response.json();
        }).then((data) => {
            const initialSnapshots = (data as {rrwebSnapshots: NumberedSnapshot[]}).rrwebSnapshots;

            // Here, we find a point at which we need to join backend snapshots with received snapshots as they may intersect
            const lastInitialSnapshot = initialSnapshots[initialSnapshots.length - 1];
            const queueStart = queuedSnapshots.current.findIndex(snapshot => snapshot.seqNo === lastInitialSnapshot.seqNo) + 1;

            queuedSnapshots.current = [...initialSnapshots, ...queuedSnapshots.current.slice(queueStart)];
            areSnapshotsLoaded.current = true;

            if (isStreamStarted.current) {
                onSnapshotsReceive(queuedSnapshots.current);
                queuedSnapshots.current = [];
            }
        });

        return () => {
            eventSource?.removeEventListener(ClientEvents.DOM_SNAPSHOTS, handleLiveSnapshotEvent);
        };
    }, [currentResult, eventSource, onSnapshotsReceive]);

    const startStream = useCallback(() => {
        isStreamStarted.current = true;

        if (areSnapshotsLoaded.current) {
            onSnapshotsReceive(queuedSnapshots.current);
            queuedSnapshots.current = [];
        }
    }, [onSnapshotsReceive]);

    return startStream;
};
