import {Gear, PauseFill, PlayFill} from '@gravity-ui/icons';
import {Button, Icon} from '@gravity-ui/uikit';
import {Replayer} from '@rrweb/replay';
import classNames from 'classnames';
import React, {ReactNode, useCallback, useEffect, useRef, useState} from 'react';
import {useSelector} from 'react-redux';

import {TestStatus} from '@/constants';
import {AttachmentType} from '@/types';
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

    const [playerWidth, setPlayerWidth] = useState<number>(1200);
    const [playerHeight, setPlayerHeight] = useState<number>(800);

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
        } else {
            const snapshot = currentResult?.attachments?.find(attachment => attachment.type === AttachmentType.Snapshot);
            if (!snapshot) {
                return;
            }

            loadSnapshotsFromZip(snapshot.path)
                .then(events => {
                    playerRef.current = new Replayer(events, {
                        liveMode: false,
                        root: playerElement
                    });
                    initializePlayer();
                });
        }

        return () => {
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
            playerRef.current.pause(newTime);
        }
    }, []);

    const currentHighlightPlayerTime = useSelector(state => state.app.snapshots.currentPlayerTime);

    useEffect(() => {
        playerRef.current?.pause(currentHighlightPlayerTime - playerRef.current?.getMetaData().startTime);
    }, [currentHighlightPlayerTime]);

    return <div>
        <div className={styles.replayerContainerContainer} style={{'--scale-factor': scaleFactor} as React.CSSProperties}>
            <div className={classNames(styles.lineHorizontal, styles.lineHorizontalTop)}></div>
            <div className={classNames(styles.lineHorizontal, styles.lineHorizontalBottom)}></div>
            <div className={classNames(styles.lineVertical, styles.lineVerticalLeft)}></div>
            <div className={classNames(styles.lineVertical, styles.lineVerticalRight)}></div>
            <div className={styles.replayerContainer} ref={playerElementRef} style={{
                aspectRatio: `${playerWidth} / ${playerHeight}`,
                maxWidth: `${playerWidth}px`
            }}></div>
        </div>
        <div className={styles.buttonsContainer}>
            <Button disabled={totalTime === 0} onClick={onPlayClick} view={'flat'}><Icon
                data={isPlaying ? PauseFill : PlayFill} size={14}/></Button>
            <Timeline currentTime={currentPlayerTime} totalTime={totalTime} onScrubStart={onScrubStart} onScrubEnd={onScrubEnd}/>
            <Button disabled={true} view={'flat'}><Icon data={Gear}/></Button>
        </div>
    </div>;
}
