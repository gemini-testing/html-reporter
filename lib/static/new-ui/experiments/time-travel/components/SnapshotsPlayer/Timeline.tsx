import strftime from 'strftime';
import React, {ReactNode, useEffect, useRef, useState} from 'react';

import styles from './Timeline.module.css';
import classNames from 'classnames';
import type {SnapshotsPlayerHighlightState} from '@/static/new-ui/types/store';

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
}

export function Timeline({totalTime, currentTime, onScrubStart, onScrub, onScrubEnd, onHover, onMouseLeave, isLive, downloadProgress, isLoading, isPlaying, highlightState, playerStartTimestamp = 0}: TimelineProps): ReactNode {
    const [isScrubbing, setIsScrubbing] = useState(false);
    const [isHovering, setIsHovering] = useState(false);
    const [displayTime, setDisplayTime] = useState(0);
    const [isMouseMoving, setIsMouseMoving] = useState(false);

    const progressRef = useRef<HTMLDivElement | null>(null);

    const getTimeFromMouseEvent = (e: MouseEvent | React.MouseEvent): number => {
        if (!progressRef.current || totalTime === 0) {
            return 0;
        }

        const rect = progressRef.current.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const ratio = Math.max(0, Math.min(1, offsetX / rect.width));

        return ratio * totalTime;
    };

    useEffect(() => {
        if (!isScrubbing && !isHovering) {
            setDisplayTime(currentTime);
        }
    }, [currentTime, isScrubbing, isHovering]);

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
    }, [isScrubbing, totalTime]);

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
            setDisplayTime(currentTime);
        }
        onMouseLeave?.();
    };

    const highlightStartTime = highlightState.highlightStartTime - playerStartTimestamp;
    const highlightEndTime = highlightState.highlightEndTime - playerStartTimestamp;
    const progressPercent =
        ((isHovering && !isScrubbing ? currentTime : displayTime) / totalTime) * 100;
    const highlightRegionPercent = highlightState.isActive ? (highlightEndTime - highlightStartTime) / totalTime * 100 : 0;
    const knobLeft = ((highlightState.isActive ? highlightStartTime : displayTime) / totalTime) * 100;
    const knobRight = ((highlightState.isActive ? highlightEndTime : displayTime) / totalTime) * 100;

    return <>
        <div className={styles.playerTime} style={{opacity: isLive || isLoading ? 0 : 1}}>{strftime('%M:%S', new Date(displayTime))}</div>
        <div
            className={styles.timelineContainer}
            ref={progressRef}
            onMouseDown={onTimelineMouseDown}
            onMouseMove={onTimelineMouseMove}
            onMouseEnter={onTimelineMouseEnter}
            onMouseLeave={onTimelineMouseLeave}
        >
            <div className={classNames(styles.playerProgressContainer, {[styles.liveTimelineBlinking]: isLive})}>
                <div
                    className={styles.playerProgressLeftCap}
                    style={{
                        background: isLive ? 'var(--color-neutral-100)' : 'var(--g-color-base-brand)',
                        opacity: highlightState.isActive ? '0.5' : '1'
                    }}/>
                <div className={styles.playerProgressRightCap}/>

                {!isLive && <div
                    className={styles.playerProgress}
                    style={{
                        transition: !isPlaying && !isMouseMoving ? 'opacity .5s ease-in-out, width .2s ease' : 'opacity .5s ease-in-out',
                        width: `${(isLoading ? downloadProgress : progressPercent).toFixed(2)}%`,
                        opacity: highlightState.isActive ? '0.5' : '1'
                    }}
                >
                    <div className={styles.progressPulse} style={{
                        visibility: isLoading ? 'visible' : 'hidden'
                    }}></div>
                </div>}

                {!isLive && <div
                    className={styles.playerProgressKnobBg}
                    style={{
                        opacity: isLoading ? '0' : '1',
                        borderLeft: '2px solid var(--color-neutral-100)',
                        borderRight: isHovering ? '2px solid var(--color-neutral-100)' : 'none',
                        left: `calc(${knobLeft.toFixed(2)}% - 2px)`,
                        transition: !isHovering && !isScrubbing && !isPlaying ? 'left .2s, scale .3s, opacity .5s .5s' : 'scale .3s, opacity 0.5s 0.5s',
                        scale: isScrubbing ? '1.15' : '1'
                    }}
                >
                    <div className={styles.playerProgressKnob}/>
                </div>}
                {!isLive && <div
                    className={styles.highlightRegion}
                    style={{
                        left: `calc(${knobLeft.toFixed(2)}%)`,
                        width: `${highlightRegionPercent.toFixed(2)}%`
                    }}
                ></div>}
                {!isLive && <div
                    className={styles.playerProgressKnobBg}
                    style={{
                        opacity: isLoading ? '0' : '1',
                        borderLeft: '2px solid transparent',
                        borderRight: '2px solid var(--color-neutral-100)',
                        left: `calc(${knobRight.toFixed(2)}% - 2px)`,
                        transition: !isHovering && !isScrubbing && !isPlaying ? 'left .2s, scale .3s, opacity .5s .5s' : 'scale .3s, opacity 0.5s 0.5s'
                    }}
                >
                    <div className={styles.playerProgressKnob}/>
                </div>}
            </div>

            {isLive && <div className={styles.liveBadgeContainer}>
                <span>LIVE</span>
            </div>}
        </div>
        <div className={styles.playerTime} style={{opacity: isLive || isLoading ? 0 : 1}}>{strftime('%M:%S', new Date(totalTime))}</div>
    </>;
}
