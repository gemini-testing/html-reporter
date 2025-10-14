import classNames from 'classnames';
import React, {ReactNode, useCallback, useRef, useState, useEffect} from 'react';
import {useViewportContext} from '../hooks/useSyncedViewport';
import {ScreenshotDisplayData} from '../types';
import {InteractiveActionsToolbar} from './InteractiveActionsToolbar';
import {calculateZoomAtPoint} from './utils';
import styles from './InteractiveScreenshot.module.css';
import {MIN_SCALE, MAX_SCALE, EXPONENTIAL_ZOOM_FACTOR, PAN_SENSITIVITY, InteractiveFitMode} from './constants';

interface InteractiveScreenshotProps {
    image: ScreenshotDisplayData;
    unifiedDimensions: {width: number; height: number};
    containerClassName?: string;
    defaultFitMode?: InteractiveFitMode;
    overlayImage?: ScreenshotDisplayData;
    showOverlay?: boolean;
}

export function InteractiveScreenshot(props: InteractiveScreenshotProps): ReactNode {
    const {viewport, updateViewport, fitMode, setFitMode} = useViewportContext();
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const lastPointerPositionRef = useRef({x: 0, y: 0});
    const previousImagePathRef = useRef(props.image.path);
    const velocityRef = useRef({x: 0, y: 0});
    const animationRef = useRef<number | null>(null);
    const imageWrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (previousImagePathRef.current !== props.image.path) {
            updateViewport({
                scale: 1,
                translateX: 0,
                translateY: 0
            });
            setFitMode(props.defaultFitMode || InteractiveFitMode.FitWidth);
            previousImagePathRef.current = props.image.path;
        }
    }, [props.image.path, props.defaultFitMode, updateViewport, setFitMode]);

    const animateMomentum = useCallback(() => {
        const vx = velocityRef.current.x;
        const vy = velocityRef.current.y;

        if (Math.abs(vx) > 0.5 || Math.abs(vy) > 0.5) {
            updateViewport((current) => ({
                translateX: current.translateX + vx,
                translateY: current.translateY + vy
            }));

            velocityRef.current.x *= 0.3;
            velocityRef.current.y *= 0.3;

            animationRef.current = requestAnimationFrame(animateMomentum);
        } else {
            velocityRef.current = {x: 0, y: 0};
            animationRef.current = null;
        }
    }, [updateViewport]);

    const handleNativeWheel = useCallback((e: WheelEvent): void => {
        e.preventDefault();
        e.stopPropagation();

        const container = containerRef.current;
        if (!container) {
            return;
        }

        const rect = container.getBoundingClientRect();
        const pointerX = e.clientX - rect.left - (imageWrapperRef.current?.offsetLeft ?? 0);
        const pointerY = e.clientY - rect.top - (imageWrapperRef.current?.offsetTop ?? 0);

        let zoomMultiplier = 1;
        let deltaX = 0;
        let deltaY = 0;

        if (e.ctrlKey || e.metaKey) {
            zoomMultiplier = Math.exp(-e.deltaY * EXPONENTIAL_ZOOM_FACTOR);
        } else {
            deltaX = -e.deltaX * PAN_SENSITIVITY;
            deltaY = -e.deltaY * PAN_SENSITIVITY;

            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
                animationRef.current = null;
            }

            velocityRef.current.x = deltaX * 0.3;
            velocityRef.current.y = deltaY * 0.3;
        }

        if (zoomMultiplier !== 1) {
            updateViewport((current) => {
                const currentScale = current.scale;
                const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, currentScale * zoomMultiplier));

                if (newScale !== currentScale) {
                    return calculateZoomAtPoint(
                        currentScale,
                        current.translateX,
                        current.translateY,
                        newScale,
                        pointerX,
                        pointerY
                    );
                }
                return {};
            });
        } else if (deltaX !== 0 || deltaY !== 0) {
            updateViewport((current) => {
                return {
                    translateX: current.translateX + deltaX,
                    translateY: current.translateY + deltaY
                };
            });

            if (!animationRef.current) {
                animationRef.current = requestAnimationFrame(animateMomentum);
            }
        }
    }, [animateMomentum, updateViewport]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) {
            return;
        }

        container.addEventListener('wheel', handleNativeWheel, {passive: false});

        return () => {
            container.removeEventListener('wheel', handleNativeWheel);
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, []);

    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        if (e.button !== 0) {
            return;
        }

        const target = e.target as HTMLElement;
        if (target.closest('[data-toolbar]')) {
            return;
        }

        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
            animationRef.current = null;
        }
        velocityRef.current = {x: 0, y: 0};

        setIsDragging(true);
        lastPointerPositionRef.current = {x: e.clientX, y: e.clientY};
        e.currentTarget.setPointerCapture(e.pointerId);
    }, []);

    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        if (!isDragging) {
            return;
        }

        const deltaX = e.clientX - lastPointerPositionRef.current.x;
        const deltaY = e.clientY - lastPointerPositionRef.current.y;

        updateViewport((current) => {
            return {
                translateX: current.translateX + deltaX,
                translateY: current.translateY + deltaY
            };
        });

        lastPointerPositionRef.current = {x: e.clientX, y: e.clientY};
    }, [isDragging, updateViewport]);

    const handlePointerUp = useCallback((e: React.PointerEvent) => {
        if (isDragging) {
            setIsDragging(false);
            e.currentTarget.releasePointerCapture(e.pointerId);
        }
    }, [isDragging]);

    const transform = `translate(${viewport.translateX}px, ${viewport.translateY}px) scale(${viewport.scale})`;

    return (
        <div
            ref={containerRef}
            className={`${styles.interactiveContainer} ${props.containerClassName || ''}`}
            style={{
                cursor: isDragging ? 'grabbing' : 'grab'
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
        >
            <div
                className={styles.unifiedContainer}
                style={{
                    aspectRatio: `${props.unifiedDimensions.width} / ${props.unifiedDimensions.height}`,
                    width: fitMode === InteractiveFitMode.FitWidth ? `calc(min(100%, ${props.unifiedDimensions.width}px))` : undefined,
                    maxHeight: fitMode === InteractiveFitMode.FitView ? `calc(min(100%, ${props.unifiedDimensions.height}px))` : undefined,
                    maxWidth: fitMode === InteractiveFitMode.FitView ? '100%' : undefined,
                    height: fitMode === InteractiveFitMode.FitView ? '100%' : undefined,
                    transform
                }}
                ref={imageWrapperRef}
            >
                <img
                    src={props.image.path}
                    alt="Screenshot"
                    className={styles.screenshot}
                    style={{
                        imageRendering: viewport.scale > 1 ? 'pixelated' : 'auto'
                    }}
                />
                {props.overlayImage && props.showOverlay && (
                    <img
                        src={props.overlayImage.path}
                        alt="Diff overlay"
                        className={classNames(styles.screenshot, styles.screenshotOverlay)}
                        style={{
                            imageRendering: viewport.scale > 1 ? 'pixelated' : 'auto'
                        }}
                    />
                )}
            </div>
            <InteractiveActionsToolbar
                className={styles.toolbar}
                image={props.image}
                containerRef={containerRef}
                imageWrapperRef={imageWrapperRef}
            />
        </div>
    );
}
