import {Gear, PauseFill, PlayFill} from '@gravity-ui/icons';
import {Button, Icon} from '@gravity-ui/uikit';
import {Replayer} from '@rrweb/replay';
import type {customEvent, eventWithTime as RrwebEvent} from '@rrweb/types';
import classNames from 'classnames';
import React, {ReactNode, useCallback, useEffect, useRef, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';

import {TestStatus} from '@/constants';
import {AttachmentType, ImageSize} from '@/types';
import {getCurrentResult} from '@/static/new-ui/features/suites/selectors';
import {Timeline} from './Timeline';
import {NumberedSnapshot} from './types';
import {loadSnapshotsFromZip, useLiveSnapshotsStream, useScaleToFit} from './utils';

import '@rrweb/replay/dist/style.css';
import styles from './index.module.css';
import {getTestSteps} from '@/static/new-ui/features/suites/components/TestSteps/selectors';
import {setCurrentHighlightStep, setCurrentStep} from '@/static/modules/actions';
import {Step, StepType} from '@/static/new-ui/features/suites/components/TestSteps/types';
import {unstable_ListTreeItemType as ListTreeItemType} from '@gravity-ui/uikit/build/esm/unstable';
import {useAnalytics} from '@/static/new-ui/hooks/useAnalytics';

function isColorSchemeEvent(event: customEvent | RrwebEvent): event is customEvent<{colorScheme: 'light' | 'dark'}> {
    return event.type === 5 && // 5 is the EventType.Custom value
        event?.data?.tag === 'color-scheme-change';
}

function getColorSchemeFromEvent(event: RrwebEvent): 'light' | 'dark' | null {
    if (!isColorSchemeEvent(event)) {
        return null;
    }

    try {
        const colorScheme = event.data.payload.colorScheme;
        if (colorScheme === 'light' || colorScheme === 'dark') {
            return colorScheme;
        }
        return null;
    } catch {
        return null;
    }
}

const MIN_PLAYER_TIME = 10;

const findActionByTime = (steps: ListTreeItemType<Step>[], startTime: number, time: number): ListTreeItemType<Step> | null => {
    // TODO: support nested steps
    for (const step of steps) {
        if (step.data.type !== StepType.Action || !step.data.startTime || !step.data.duration) {
            continue;
        }
        const stepStartTime = step.data.startTime - startTime;
        const stepEndTime = step.data.startTime - startTime + step.data.duration;
        if (time > stepStartTime && time < stepEndTime) {
            return step;
        }
    }

    return null;
};

export function SnapshotsPlayer(): ReactNode {
    const currentResult = useSelector(getCurrentResult);

    const [playerElement, setPlayerElement] = useState<HTMLDivElement | null>(null);
    const playerRef = useRef<Replayer | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const customEventsRef = useRef<RrwebEvent[]>([]);
    const [iframeColorScheme, setIframeColorScheme] = useState<'light' | 'dark'>('light');

    const [playerWidth, setPlayerWidth] = useState<number>(1200);
    const [playerHeight, setPlayerHeight] = useState<number>(800);
    const isLiveMaxSizeInitialized = useRef(false);
    const [maxPlayerSize, setMaxPlayerSize] = useState<ImageSize>({height: 0, width: 0});

    const [totalTime, setTotalTime] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isSnapshotMissing, setIsSnapshotMissing] = useState(false);
    const [snapshotLoadingError, setSnapshotLoadingError] = useState<Error | null>(null);

    const finishedPlayingRef = useRef(false);
    const [currentPlayerTime, setCurrentPlayerTime] = useState(0);

    const timerIdRef = useRef<number | null>(null);

    const dispatch = useDispatch();
    const analytics = useAnalytics();

    useEffect(() => {
        analytics?.trackFeatureUsage({featureName: 'Time Travel Player Render'});
    }, []);

    const lastSetStepId = useRef<string | null | undefined>(null);
    const currentHighlightStepId = useSelector(state => state.app.suitesPage.currentHighlightedStepId);
    const testSteps = useSelector(getTestSteps);
    const [isSnapshotZipLoading, setIsSnapshotZipLoading] = useState(false);
    const [snapshotZipDownloadProgress, setSnapshotZipDownloadProgress] = useState(0);
    const loadingVisibleTimeRef = useRef<number | null>(null);
    const MIN_LOADING_DISPLAY_TIME = 1000; // minimum time to show loading in ms

    const cancelTimeTicking = (): void => {
        if (timerIdRef.current) {
            cancelAnimationFrame(timerIdRef.current);
            timerIdRef.current = null;
        }
    };
    const startTimeTicking = (): void => {
        cancelTimeTicking();

        function update(): void {
            if (!playerRef.current) {
                return;
            }
            const currentTime = playerRef.current.getCurrentTime();
            const meta = playerRef.current.getMetaData();
            setCurrentPlayerTime(currentTime);

            const playerStartTime = playerRef.current.getMetaData().startTime;
            const currentAction = findActionByTime(testSteps, playerStartTime, currentTime);
            if (currentAction && currentAction.id !== lastSetStepId.current) {
                lastSetStepId.current = currentAction.id;
                dispatch(setCurrentStep({stepId: currentAction.id}));
            }

            if (currentTime < meta.totalTime) {
                timerIdRef.current = requestAnimationFrame(update);
            }
        }

        timerIdRef.current = requestAnimationFrame(update);
    };

    const setLastActionAsActive = (): void => {
        if (!isPlaying) {
            return;
        }
        const lastAction = testSteps.findLast(step => step.data.type === StepType.Action);
        if (lastAction) {
            dispatch(setCurrentStep({stepId: lastAction.id}));
        }
    };

    const onPlayerFinishPlaying = (): void => {
        if (timerIdRef.current) {
            finishedPlayingRef.current = true;
        }
        setIsPlaying(false);
        cancelTimeTicking();

        setLastActionAsActive();
    };

    const initializePlayer = useCallback((isLive = false): void => {
        if (!playerRef.current) {
            return;
        }

        playerRef.current.enableInteract();
        playerRef.current.on('resize', (newSize) => {
            const size = newSize as {height: number; width: number};
            setPlayerHeight(size.height);
            setPlayerWidth(size.width);

            if (isLive && !isLiveMaxSizeInitialized.current) {
                isLiveMaxSizeInitialized.current = true;
                setMaxPlayerSize({width: size.width, height: size.height});
            }
        });
        playerRef.current.on('finish', onPlayerFinishPlaying);

        if (!isLive) {
            setTotalTime(playerRef.current.getMetaData().totalTime);
        } else {
            setTotalTime(0);
        }
        setCurrentPlayerTime(0);
    }, [isLiveMaxSizeInitialized]);
    const destroyPlayer = useCallback(() => {
        playerRef.current?.destroy();
        playerRef.current = null;
    }, []);

    useEffect(() => {
        isLiveMaxSizeInitialized.current = false;
        setIsPlaying(false);
        cancelTimeTicking();
        finishedPlayingRef.current = false;
        setIsSnapshotMissing(false);
    }, [currentResult?.id]);

    const onLiveSnapshotsReceive = useCallback((snapshots: NumberedSnapshot[]) => {
        if (!playerRef.current) {
            return;
        }

        for (const snapshot of snapshots) {
            playerRef.current.addEvent(snapshot);
        }

        if (playerRef.current.service.state.value !== 'live') {
            if (snapshots.length > 0) {
                try {
                    // Under extremely rare circumstances this can throw. It wasn't clear why exactly.
                    playerRef.current.play(Date.now() - snapshots[0].timestamp);
                } catch {
                    try {
                        playerRef.current.startLive();
                    } catch { /* */ }
                }
            } else {
                playerRef.current.startLive();
            }
        }
    }, []);
    const startStreaming = useLiveSnapshotsStream(currentResult, onLiveSnapshotsReceive);

    const finalizeLoading = (): void => {
        const hideLoading = (): void => {
            setIsSnapshotZipLoading(false);
            loadingVisibleTimeRef.current = null;
        };

        // If loading indicator became visible, ensure it stays visible for at least MIN_LOADING_DISPLAY_TIME
        if (loadingVisibleTimeRef.current !== null) {
            const currentTime = new Date().getTime();
            const timeElapsed = currentTime - loadingVisibleTimeRef.current;
            if (timeElapsed < MIN_LOADING_DISPLAY_TIME) {
                setTimeout(hideLoading, MIN_LOADING_DISPLAY_TIME - timeElapsed);
            } else {
                hideLoading();
            }
        } else {
            hideLoading();
        }
    };

    const updateLoadingVisibleTime = (): void => {
        if (loadingVisibleTimeRef.current === null) {
            loadingVisibleTimeRef.current = new Date().getTime();
        }
    };

    // Handle custom events
    const handleCustomEvent = useCallback((event: unknown) => {
        const rrwebEvent = event as RrwebEvent;
        const colorScheme = getColorSchemeFromEvent(rrwebEvent);
        if (colorScheme) {
            setIframeColorScheme(colorScheme);
        }
    }, []);

    useEffect(() => {
        if (!currentResult || !playerElement) {
            return;
        }

        if (currentResult.status === TestStatus.RUNNING) {
            playerRef.current = new Replayer([], {
                liveMode: true,
                root: playerElement
            });
            initializePlayer(true);
            startStreaming();

            playerRef.current.on('custom-event', handleCustomEvent);
        } else {
            const snapshot = currentResult?.attachments?.find(attachment => attachment.type === AttachmentType.Snapshot);
            if (!snapshot) {
                return;
            }

            if (!isLiveMaxSizeInitialized.current) {
                setMaxPlayerSize({width: snapshot.maxWidth, height: snapshot.maxHeight});
            }
            abortControllerRef.current = new AbortController();
            setIsSnapshotZipLoading(true);
            setSnapshotZipDownloadProgress(0);
            const downloadStartTime = new Date();
            const onDownloadProgress = (progress: number): void => {
                if (new Date().getTime() - downloadStartTime.getTime() > 500) {
                    setSnapshotZipDownloadProgress(progress);
                    updateLoadingVisibleTime();
                }
            };
            loadSnapshotsFromZip(snapshot.path, {abortSignal: abortControllerRef.current.signal, onDownloadProgress})
                .then(events => {
                    customEventsRef.current = events.filter(isColorSchemeEvent);

                    playerRef.current = new Replayer(events, {
                        liveMode: false,
                        root: playerElement
                    });
                    initializePlayer();

                    playerRef.current.on('custom-event', handleCustomEvent);

                    finalizeLoading();
                })
                .catch(e => {
                    setIsSnapshotZipLoading(false);
                    loadingVisibleTimeRef.current = null;
                    setIsSnapshotMissing(true);
                    setSnapshotLoadingError(e);
                    console.warn('Failed to load snapshots', e);
                });
        }

        return () => {
            abortControllerRef.current?.abort();
            abortControllerRef.current = null;
            destroyPlayer();
        };
    }, [currentResult, playerElement, startStreaming, initializePlayer, destroyPlayer, handleCustomEvent]);
    const playerElementRef = useCallback((node: HTMLDivElement | null) => {
        if (node !== null) {
            setPlayerElement(node);
        }
    }, []);
    const scaleFactor = useScaleToFit(playerElement);

    const onPlayClick = (): void => {
        if (!isPlaying) {
            setIsPlaying(true);
            if (finishedPlayingRef.current) {
                playerRef.current?.play();
            } else {
                playerRef.current?.play(currentPlayerTime);
            }
            finishedPlayingRef.current = false;
            startTimeTicking();
        } else {
            playerRef.current?.pause();
            setIsPlaying(false);
            cancelTimeTicking();
        }
    };

    const onScrubStart = useCallback(() => {
        if (isSnapshotMissing) {
            return;
        }
        if (isPlaying && playerRef.current) {
            playerRef.current.pause();
            setIsPlaying(false);
            cancelTimeTicking();
            finishedPlayingRef.current = false;
        }
        dispatch(setCurrentHighlightStep({stepId: null}));
    }, [isPlaying, isSnapshotMissing]);
    const onScrub = useCallback((newTime: number) => {
        if (isSnapshotMissing) {
            return;
        }

        if (playerRef.current) {
            const playerStartTime = playerRef.current.getMetaData().startTime;
            const currentAction = findActionByTime(testSteps, playerStartTime, newTime);
            if (currentAction && currentAction.id !== lastSetStepId.current) {
                lastSetStepId.current = currentAction.id;
                dispatch(setCurrentStep({stepId: currentAction.id}));
            }
        }
    }, [testSteps, isSnapshotMissing]);
    const onScrubEnd = useCallback((newTime: number) => {
        if (isSnapshotMissing) {
            return;
        }

        setCurrentPlayerTime(newTime);
        if (playerRef.current) {
            const lastColorScheme = customEventsRef.current.findLast(e =>
                isColorSchemeEvent(e) &&
                playerRef.current &&
                e.timestamp <= (playerRef.current.getMetaData().startTime + newTime)
            );

            if (lastColorScheme) {
                const colorScheme = getColorSchemeFromEvent(lastColorScheme);
                if (colorScheme) {
                    setIframeColorScheme(colorScheme);
                }
            }

            playerRef.current.pause(newTime);

            const playerStartTime = playerRef.current.getMetaData().startTime;
            const currentAction = findActionByTime(testSteps, playerStartTime, newTime);
            if (currentAction && currentAction.id !== lastSetStepId.current) {
                lastSetStepId.current = currentAction.id;
                dispatch(setCurrentStep({stepId: currentAction.id}));
            }
        }
    }, [testSteps, isSnapshotMissing]);
    const onTimelineHover = useCallback((newTime: number) => {
        if (isSnapshotMissing) {
            return;
        }

        if (playerRef.current) {
            finishedPlayingRef.current = false;
            const playerStartTime = playerRef.current.getMetaData().startTime;
            const currentAction = findActionByTime(testSteps, playerStartTime, newTime);
            if (currentAction && currentAction.id !== currentHighlightStepId) {
                dispatch(setCurrentHighlightStep({stepId: currentAction.id}));
            }
        }
    }, [testSteps, currentHighlightStepId, isSnapshotMissing]);
    const onTimelineMouseLeave = useCallback(() => {
        if (isSnapshotMissing) {
            return;
        }

        dispatch(setCurrentHighlightStep({stepId: null}));
    }, [dispatch, isSnapshotMissing]);

    const currentPlayerHighlightState = useSelector(state => state.app.snapshotsPlayer);

    useEffect(() => {
        if (isSnapshotMissing) {
            return;
        }

        if (currentPlayerHighlightState.isActive) {
            playerRef.current?.pause(currentPlayerHighlightState.highlightEndTime - playerRef.current?.getMetaData().startTime);
            setIsPlaying(false);
            cancelTimeTicking();
        } else if (!isPlaying) {
            playerRef.current?.pause(currentPlayerTime > 0 ? currentPlayerTime : MIN_PLAYER_TIME);
        }
    }, [currentPlayerHighlightState, isSnapshotMissing]);

    useEffect(() => {
        if (isSnapshotMissing || !playerRef.current) {
            return;
        }

        const newPlayerTime = Math.max(currentPlayerHighlightState.goToTime - playerRef.current.getMetaData().startTime, MIN_PLAYER_TIME);
        setCurrentPlayerTime(newPlayerTime);
        playerRef.current.pause(newPlayerTime);
    }, [currentPlayerHighlightState.goToTime, isSnapshotMissing]);

    const playerContainerStyle: React.CSSProperties = {
        aspectRatio: `${maxPlayerSize.width} / ${maxPlayerSize.height}`,
        maxWidth: `${maxPlayerSize.width}px`,
        maxHeight: `calc(100vh - var(--sticky-header-height) - 150px)`, // 150px is just an arbitrary value to add some space around the player
        colorScheme: iframeColorScheme
    };

    const playerStyle: React.CSSProperties = {
        aspectRatio: `${playerWidth} / ${playerHeight}`,
        maxWidth: `min(${playerWidth}px, 100%)`,
        maxHeight: '100%',
        transition: 'opacity .5s ease'
    };

    const isLive = currentResult?.status === TestStatus.RUNNING;
    let playerStartTimestamp = 0;
    try {
        // This can throw if player hasn't received events yet.
        playerStartTimestamp = playerRef.current?.getMetaData().startTime ?? 0;
    } catch { /* */ }

    return <div className={classNames(
        {
            [styles['is-loading']]: isSnapshotZipLoading,
            [styles['is-live']]: isLive,
            [styles['is-snapshot-missing']]: isSnapshotMissing
        }
    )}>
        {/* This container defines how much space is available to the player in total and sets paddings. */}
        <div className={styles.replayerRootContainer} style={{
            '--scale-factor': scaleFactor,
            width: `${maxPlayerSize.width}px`,
            maxWidth: '100%'
        } as React.CSSProperties}>
            {/* This container is for maintaining constant aspect ratio and size of the player; prevent jumps of UI when iframe resizes. */}
            <div className={styles.replayerContainerCentered} style={playerContainerStyle}>
                {/* This container is to match visible player size to draw lines correctly */}
                <div className={styles.replayerContainerCentered} style={playerStyle}>
                    <div className={classNames(styles.lineHorizontal, styles.lineHorizontalTop)}></div>
                    <div className={classNames(styles.lineHorizontal, styles.lineHorizontalBottom)}></div>
                    <div className={classNames(styles.lineVertical, styles.lineVerticalLeft)}></div>
                    <div className={classNames(styles.lineVertical, styles.lineVerticalRight)}></div>

                    <div className={styles.loadingContainer}>
                        <span>Loading snapshots data</span>
                        <div className={styles.loader}/>
                    </div>

                    {isSnapshotMissing && (
                        <div className={styles.snapshotMissingContainer}>
                            <span>Snapshot data is not available</span>
                            {snapshotLoadingError && (
                                <span>Error: {snapshotLoadingError.message}</span>
                            )}
                        </div>
                    )}

                    {/* This container is for the player itself and matches size of the outer container */}
                    <div className={styles.replayerContainer} ref={playerElementRef} style={playerStyle}>
                        <div style={{width: '100vw'}}></div>
                    </div>
                </div>
            </div>
        </div>
        <div className={styles.buttonsContainer}>
            <Button
                onClick={onPlayClick}
                view={'flat'}
                className={classNames(styles.playPauseButton, styles.controlButton)}
                disabled={isSnapshotMissing}
            >
                <div
                    className={classNames(styles.playPauseIcon, {[styles.playPauseIconVisible]: isPlaying})}>
                    <Icon data={PauseFill} size={14}/></div>
                <div
                    className={classNames(styles.playPauseIcon, {[styles.playPauseIconVisible]: !isPlaying})}>
                    <Icon data={PlayFill} size={14}/></div>
            </Button>
            <Timeline
                currentTime={currentPlayerTime}
                totalTime={totalTime}
                onScrubStart={onScrubStart}
                onScrub={onScrub}
                onScrubEnd={onScrubEnd}
                onHover={onTimelineHover}
                onMouseLeave={onTimelineMouseLeave}
                isLive={isLive}
                isLoading={isSnapshotZipLoading}
                downloadProgress={snapshotZipDownloadProgress}
                isPlaying={isPlaying}
                playerStartTimestamp={playerStartTimestamp}
                highlightState={currentPlayerHighlightState}
                isSnapshotMissing={isSnapshotMissing}
            />
            <Button
                disabled={true || isSnapshotMissing}
                view={'flat'}
                className={styles.controlButton}
            >
                <Icon data={Gear}/>
            </Button>
        </div>
    </div>;
}
