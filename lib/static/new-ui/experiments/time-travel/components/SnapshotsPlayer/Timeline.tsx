import strftime from 'strftime';
import React, {ReactNode, useEffect, useRef, useState} from 'react';

import styles from './Timeline.module.css';

interface TimelineProps {
    totalTime: number;
    currentTime: number;
    onScrubStart: () => void;
    onScrubEnd: (newTime: number) => void;
}

export function Timeline({totalTime, currentTime, onScrubStart, onScrubEnd}: TimelineProps): ReactNode {
    const [isScrubbing, setIsScrubbing] = useState(false);
    const [isHovering, setIsHovering] = useState(false);
    const [displayTime, setDisplayTime] = useState(0);

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

            const newTime = getTimeFromMouseEvent(e);
            setDisplayTime(newTime);
        }

        function handleMouseUp(e: MouseEvent): void {
            if (!isScrubbing) {
                return;
            }

            const finalTime = getTimeFromMouseEvent(e);
            setDisplayTime(finalTime);

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
        // if (isPlaying && playerRef.current) {
        //     playerRef.current.pause();
        //     setIsPlaying(false);
        //     stopTimer();
        // }
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
    };

    const progressPercent =
        ((isHovering && !isScrubbing ? currentTime : displayTime) / totalTime) * 100;
    const knobLeft = (displayTime / totalTime) * 100;

    return <>
        <div className={styles.playerTime}>{strftime('%M:%S', new Date(displayTime))}</div>
        <div
            className={styles.playerProgressContainer}
            ref={progressRef}
            onMouseDown={onTimelineMouseDown}
            onMouseMove={onTimelineMouseMove}
            onMouseEnter={onTimelineMouseEnter}
            onMouseLeave={onTimelineMouseLeave}
        >
            <div className={styles.playerProgressLeftCap}/>
            <div className={styles.playerProgressRightCap}/>

            <div
                className={styles.playerProgress}
                style={{
                    width: `${progressPercent.toFixed(2)}%`
                }}
            />

            <div
                className={styles.playerProgressKnobBg}
                style={{
                    left: `calc(${knobLeft.toFixed(2)}% - 2px)`
                }}
            >
                <div className={styles.playerProgressKnob}/>
            </div>
        </div>
        <div className={styles.playerTime}>{strftime('%M:%S', new Date(totalTime))}</div>
    </>;
}
