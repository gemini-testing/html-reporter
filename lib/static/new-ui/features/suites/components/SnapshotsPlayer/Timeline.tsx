import classNames from 'classnames';
import React, {ReactNode, useEffect, useRef, useState} from 'react';
import strftime from 'strftime';

import styles from './Timeline.module.css';
import type {SnapshotsPlayerHighlightState} from '@/static/new-ui/types/store';
import {clamp} from 'lodash';

interface TimelineProps {
    totalTime: number;
    currentTime: number;
    onScrubStart: () => void;
    onScrub?: (time: number) => void;
    onScrubEnd: (newTime: number) => void;
    onHover?: (time: number) => void;
    onMouseLeave?: () => void;
    isLive: boolean;
    isLoading: boolean;
    downloadProgress: number;
    isPlaying: boolean;
    playerStartTimestamp?: number;
    highlightState: SnapshotsPlayerHighlightState;
    isSnapshotMissing?: boolean;
}

const formatTime = (time: number): string => strftime('%M:%S', new Date(time));

export function Timeline({
    totalTime,
    currentTime,
    onScrubStart,
    onScrub,
    onScrubEnd,
    onHover,
    onMouseLeave,
    isLive,
    downloadProgress,
    isLoading,
    isPlaying,
    highlightState,
    playerStartTimestamp = 0,
    isSnapshotMissing = false
}: TimelineProps): ReactNode {
    const [isScrubbing, setIsScrubbing] = useState(false);
    const [isHovering, setIsHovering] = useState(false);
    const [displayTime, setDisplayTime] = useState(0);
    const [isMouseMoving, setIsMouseMoving] = useState(false);

    const progressRef = useRef<HTMLDivElement | null>(null);

    const safeTotalTime = Number.isFinite(totalTime) && totalTime > 0 ? totalTime : 0;
    const getBoundedTime = (time: number): number => {
        if (!Number.isFinite(time) || safeTotalTime === 0) {
            return 0;
        }

        return clamp(time, 0, safeTotalTime);
    };
    const getProgressPercent = (time: number): number => safeTotalTime === 0 ? 0 : getBoundedTime(time) / safeTotalTime * 100;

    const getTimeFromMouseEvent = (e: MouseEvent | React.MouseEvent): number => {
        if (!progressRef.current || safeTotalTime === 0) {
            return 0;
        }

        const rect = progressRef.current.getBoundingClientRect();
        if (rect.width <= 0) {
            return 0;
        }

        const offsetX = e.clientX - rect.left;
        const ratio = Math.max(0, Math.min(1, offsetX / rect.width));

        return ratio * safeTotalTime;
    };

    useEffect(() => {
        if (!isScrubbing && !isHovering) {
            setDisplayTime(getBoundedTime(currentTime));
        }
    }, [currentTime, isScrubbing, isHovering, safeTotalTime]);

    // Disable text selection while scrubbing
    useEffect(() => {
        let styleNode: HTMLStyleElement;

        if (isScrubbing) {
            styleNode = document.createElement('style');
            styleNode.innerHTML = `* { user-select: none !important; }`;
            document.head.appendChild(styleNode);
        }

        return () => {
            if (styleNode && styleNode.parentNode) {
                styleNode.parentNode.removeChild(styleNode);
            }
        };
    }, [isScrubbing]);

    // Attach global mousemove/mouseup if scrubbing, so if user
    // drags outside the timeline, we keep scrubbing until mouse up.
    useEffect(() => {
        function handleMouseMove(e: MouseEvent): void {
            if (!isScrubbing) {
                return;
            }

            setIsMouseMoving(true);
            const newTime = getTimeFromMouseEvent(e);
            setDisplayTime(newTime);
            onScrub?.(newTime);
        }

        function handleMouseUp(e: MouseEvent): void {
            if (!isScrubbing) {
                return;
            }

            const finalTime = getTimeFromMouseEvent(e);
            setDisplayTime(finalTime);

            setIsMouseMoving(false);
            setIsScrubbing(false);
            onScrubEnd(finalTime);
        }

        if (isScrubbing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isScrubbing, safeTotalTime]);

    const onTimelineMouseDown = (e: React.MouseEvent): void => {
        const clickedTime = getTimeFromMouseEvent(e);
        setDisplayTime(clickedTime);

        setIsScrubbing(true);
        onScrubStart();
    };

    const onTimelineMouseMove = (e: React.MouseEvent): void => {
        if (isScrubbing) {
            // If user is scrubbing, ignore local handling, because the global mousemove will do the update.
            return;
        }

        const hoveredTime = getTimeFromMouseEvent(e);
        onHover?.(hoveredTime);
        setDisplayTime(hoveredTime);
    };

    const onTimelineMouseEnter = (): void => {
        setIsHovering(true);
    };

    const onTimelineMouseLeave = (): void => {
        setIsHovering(false);
        // If not scrubbing, revert the knob to real player time
        if (!isScrubbing) {
            setDisplayTime(getBoundedTime(currentTime));
        }
        onMouseLeave?.();
    };

    const rawHighlightStartTime = highlightState.highlightStartTime - playerStartTimestamp;
    const rawHighlightEndTime = highlightState.highlightEndTime - playerStartTimestamp;
    const highlightStartTime = getBoundedTime(Math.min(rawHighlightStartTime, rawHighlightEndTime));
    const highlightEndTime = getBoundedTime(Math.max(rawHighlightStartTime, rawHighlightEndTime));
    const visibleTimelineMultiplier = Number(!isSnapshotMissing);
    const progressPercent = getProgressPercent(isHovering && !isScrubbing ? currentTime : displayTime) * visibleTimelineMultiplier;
    const highlightStartPercent = getProgressPercent(highlightStartTime);
    const highlightEndPercent = getProgressPercent(highlightEndTime);
    const highlightRegionWidth = highlightState.isActive ? Math.max(highlightEndPercent - highlightStartPercent, 0) * visibleTimelineMultiplier : 0;
    const leftKnobPosition = (highlightState.isActive ? highlightStartPercent : getProgressPercent(displayTime)) * visibleTimelineMultiplier;
    const rightKnobPosition = (highlightState.isActive ? highlightEndPercent : getProgressPercent(displayTime)) * visibleTimelineMultiplier;
    const loadingProgressPercent = (Number.isFinite(downloadProgress) ? clamp(downloadProgress, 0, 100) : 0) * visibleTimelineMultiplier;

    const containerClasses = classNames(
        styles.container,
        {
            [styles['is-live']]: isLive,
            [styles['is-loading']]: isLoading,
            [styles['is-highlight-active']]: highlightState.isActive,
            [styles['is-playing']]: isPlaying,
            [styles['is-hovering']]: isHovering,
            [styles['is-scrubbing']]: isScrubbing && isMouseMoving,
            [styles['is-snapshot-missing']]: isSnapshotMissing
        }
    );

    return (
        <div className={containerClasses}>
            <div className={styles.playerTime}>
                {isSnapshotMissing ? '––:––' : formatTime(getBoundedTime(displayTime))}
            </div>

            <div
                className={styles.timelineContainer}
                ref={progressRef}
                onMouseDown={onTimelineMouseDown}
                onMouseMove={onTimelineMouseMove}
                onMouseEnter={onTimelineMouseEnter}
                onMouseLeave={onTimelineMouseLeave}
            >
                <div className={classNames(
                    styles.playerProgressContainer,
                    {[styles.liveTimelineBlinking]: isLive}
                )}>
                    <div className={styles.playerProgressLeftCap} />
                    <div className={styles.playerProgressRightCap} />

                    <>
                        <div
                            className={styles.playerProgress}
                            style={{
                                width: `${(isLoading ? loadingProgressPercent : progressPercent).toFixed(2)}%`
                            }}
                        >
                            <div className={styles.progressPulse} />
                        </div>

                        <div
                            className={classNames(styles.playerProgressKnobBg, styles.playerProgressKnobBgLeft)}
                            style={{
                                left: `calc(${leftKnobPosition.toFixed(2)}% - 2px)`
                            }}
                        >
                            <div className={styles.playerProgressKnob} />
                        </div>

                        <div
                            className={styles.highlightRegion}
                            style={{
                                left: `calc(${leftKnobPosition.toFixed(2)}%)`,
                                width: `${highlightRegionWidth.toFixed(2)}%`
                            }}
                        />

                        <div
                            className={classNames(styles.playerProgressKnobBg, styles.playerProgressKnobBgRight)}
                            style={{
                                left: `calc(${rightKnobPosition.toFixed(2)}% - 2px)`
                            }}
                        >
                            <div className={styles.playerProgressKnob} />
                        </div>
                    </>
                </div>

                <div className={styles.liveBadgeContainer}>
                    <span>LIVE</span>
                </div>
            </div>

            <div className={styles.playerTime}>
                {isSnapshotMissing ? '––:––' : formatTime(safeTotalTime)}
            </div>
        </div>
    );
}
