import {Gear, PauseFill, PlayFill} from '@gravity-ui/icons';
import {Button, Icon} from '@gravity-ui/uikit';
import {Replayer} from '@rrweb/replay';
import type {eventWithTime as RrwebEvent} from '@rrweb/types';
import classNames from 'classnames';
import React, {ReactNode, useCallback, useEffect, useRef, useState} from 'react';
import {useSelector} from 'react-redux';

import {TestStatus} from '@/constants';
import {AttachmentType, ImageSize} from '@/types';
import {getCurrentResult} from '@/static/new-ui/features/suites/selectors';
import {Timeline} from './Timeline';
import {NumberedSnapshot} from './types';
import {useScaleToFit, loadSnapshotsFromZip, useLiveSnapshotsStream} from './utils';

import '@rrweb/replay/dist/style.css';
import styles from './index.module.css';

export function SnapshotsPlayer(): ReactNode {
    const currentResult = useSelector(getCurrentResult);

    const [playerElement, setPlayerElement] = useState<HTMLDivElement | null>(null);
    const playerRef = useRef<Replayer | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const customEventsRef = useRef<RrwebEvent[]>([]);
    const [iframeColorScheme, setIframeColorScheme] = useState<'light' | 'dark'>('light');

    const [playerWidth, setPlayerWidth] = useState<number>(1200);
    const [playerHeight, setPlayerHeight] = useState<number>(800);
    const [maxPlayerSize, setMaxPlayerSize] = useState<ImageSize>({height: 0, width: 0});

    const [totalTime, setTotalTime] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);

    const finishedPlayingRef = useRef(false);
    const [currentPlayerTime, setCurrentPlayerTime] = useState(0);

    const timerIdRef = useRef<number | null>(null);

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

            if (currentTime < meta.totalTime) {
                timerIdRef.current = requestAnimationFrame(update);
            }
        }

        timerIdRef.current = requestAnimationFrame(update);
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
        });
        playerRef.current.on('finish', () => {
            setIsPlaying(false);
            finishedPlayingRef.current = true;
            cancelTimeTicking();
        });

        if (!isLive) {
            setTotalTime(playerRef.current.getMetaData().totalTime);
        } else {
            setTotalTime(0);
        }
        setCurrentPlayerTime(0);
    }, []);
    const destroyPlayer = useCallback(() => {
        playerRef.current?.destroy();
        playerRef.current = null;
    }, []);

    const onLiveSnapshotsReceive = useCallback((snapshots: NumberedSnapshot[]) => {
        if (!playerRef.current) {
            return;
        }

        for (const snapshot of snapshots) {
            playerRef.current.addEvent(snapshot);
        }

        if (playerRef.current.service.state.value !== 'live') {
            if (snapshots.length > 0) {
                playerRef.current.play(Date.now() - snapshots[0].timestamp);
            } else {
                playerRef.current.startLive();
            }
        }
    }, []);
    const startStreaming = useLiveSnapshotsStream(currentResult, onLiveSnapshotsReceive);

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

            playerRef.current.on('custom-event', (e) => {
                if ((e as any).data.tag === 'color-scheme-change') {
                    setIframeColorScheme((e as any).data.payload.colorScheme);
                }
            });
        } else {
            const snapshot = currentResult?.attachments?.find(attachment => attachment.type === AttachmentType.Snapshot);
            if (!snapshot) {
                return;
            }

            setMaxPlayerSize({width: snapshot.maxWidth, height: snapshot.maxHeight});
            abortControllerRef.current = new AbortController();
            loadSnapshotsFromZip(snapshot.path, abortControllerRef.current.signal)
                .then(events => {
                    customEventsRef.current = events.filter(event => event.type === 5 && event.data.tag === 'color-scheme-change');

                    playerRef.current = new Replayer(events, {
                        liveMode: false,
                        root: playerElement
                    });
                    initializePlayer();

                    playerRef.current.on('custom-event', (e) => {
                        if ((e as any).data.tag === 'color-scheme-change') {
                            setIframeColorScheme((e as any).data.payload.colorScheme);
                        }
                    });
                })
                .catch(e => {
                    console.warn('Failed to load snapshots', e);
                });
        }

        return () => {
            abortControllerRef.current?.abort();
            abortControllerRef.current = null;
            destroyPlayer();
        };
    }, [currentResult, playerElement, startStreaming, initializePlayer, destroyPlayer]);
    const playerElementRef = useCallback((node: HTMLDivElement | null) => {
        if (node !== null) {
            setPlayerElement(node);
        }
    }, []);
    const scaleFactor = useScaleToFit(playerElement);

    const onPlayClick = (): void => {
        if (!isPlaying) {
            if (finishedPlayingRef.current) {
                playerRef.current?.play();
            } else {
                playerRef.current?.play(currentPlayerTime);
            }
            finishedPlayingRef.current = false;
            setIsPlaying(true);
            startTimeTicking();
        } else {
            playerRef.current?.pause();
            setIsPlaying(false);
            cancelTimeTicking();
        }
    };

    const onScrubStart = useCallback(() => {
        if (isPlaying && playerRef.current) {
            playerRef.current.pause();
            setIsPlaying(false);
            cancelTimeTicking();
        }
    }, [isPlaying]);
    const onScrubEnd = useCallback((newTime: number) => {
        setCurrentPlayerTime(newTime);
        if (playerRef.current) {
            const lastColorScheme = customEventsRef.current.findLast(e =>
                e.type === 5 &&
                e.data.tag === 'color-scheme-change' &&
                playerRef.current &&
                e.timestamp <= (playerRef.current.getMetaData().startTime + newTime)
            );

            if (lastColorScheme) {
                setIframeColorScheme((lastColorScheme.data as any).payload.colorScheme);
            }

            playerRef.current.pause(newTime);
        }
    }, []);

    const currentHighlightPlayerTime = useSelector(state => state.app.snapshots.currentPlayerTime);

    useEffect(() => {
        playerRef.current?.pause(currentHighlightPlayerTime - playerRef.current?.getMetaData().startTime);
    }, [currentHighlightPlayerTime]);

    const playerContainerStyle: React.CSSProperties = {
        aspectRatio: `${maxPlayerSize.width} / ${maxPlayerSize.height}`,
        maxWidth: `${maxPlayerSize.width}px`,
        maxHeight: `calc(100vh - var(--sticky-header-height) - 150px)`,
        colorScheme: iframeColorScheme
    };

    const playerStyle: React.CSSProperties = {
        aspectRatio: `${playerWidth} / ${playerHeight}`,
        maxWidth: `${playerWidth}px`,
        maxHeight: '100%'
    };

    return <div>
        {/* This container defines how much space is available to the player in total and sets paddings. */}
        <div className={styles.replayerRootContainer} style={{'--scale-factor': scaleFactor, width: `${maxPlayerSize.width}px`, maxWidth: '100%'} as React.CSSProperties}>
            {/* This container is for maintaining constant aspect ratio and size of the player; prevent jumps of UI when iframe resizes. */}
            <div className={styles.replayerContainerCentered} style={playerContainerStyle}>
                {/* This container is to match visible player size to draw lines correctly */}
                <div className={styles.replayerContainerCentered} style={playerStyle}>
                    <div className={classNames(styles.lineHorizontal, styles.lineHorizontalTop)}></div>
                    <div className={classNames(styles.lineHorizontal, styles.lineHorizontalBottom)}></div>
                    <div className={classNames(styles.lineVertical, styles.lineVerticalLeft)}></div>
                    <div className={classNames(styles.lineVertical, styles.lineVerticalRight)}></div>

                    {/* This container is for the player itself and matches size of the outer container */}
                    <div className={styles.replayerContainer} ref={playerElementRef} style={playerStyle}></div>

                    <div></div>
                </div>
            </div>
        </div>
        <div className={styles.buttonsContainer}>
            <Button disabled={totalTime === 0} onClick={onPlayClick} view={'flat'}><Icon
                data={isPlaying ? PauseFill : PlayFill} size={14}/></Button>
            <Timeline currentTime={currentPlayerTime} totalTime={totalTime} onScrubStart={onScrubStart} onScrubEnd={onScrubEnd}/>
            <Button disabled={true} view={'flat'}><Icon data={Gear}/></Button>
        </div>
    </div>;
}
