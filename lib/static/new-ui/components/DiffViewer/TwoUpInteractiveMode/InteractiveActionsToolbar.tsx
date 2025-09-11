import React, {ReactNode, useCallback} from 'react';
import {Button, Icon} from '@gravity-ui/uikit';
import {ArrowDownToSquare, SquareDashed, Plus, Minus, ChevronsExpandToLines} from '@gravity-ui/icons';
import {useViewportContext} from '../hooks/useSyncedViewport';
import {ScreenshotDisplayData} from '../types';
import styles from './InteractiveActionsToolbar.module.css';
import classNames from 'classnames';
import {calculateZoomAtPoint} from './utils';
import {MIN_SCALE, MAX_SCALE, ZOOM_STEP, InteractiveFitMode} from './constants';

interface InteractiveActionsToolbarProps {
    image: ScreenshotDisplayData;
    className?: string;
    containerRef: React.RefObject<HTMLDivElement>;
    imageWrapperRef: React.RefObject<HTMLDivElement>;
}

export function InteractiveActionsToolbar(props: InteractiveActionsToolbarProps): ReactNode {
    const {updateViewport, setFitMode} = useViewportContext();

    const handleZoomIn = useCallback(() => {
        const container = props.containerRef.current;
        if (!container) {
            return;
        }

        const rect = container.getBoundingClientRect();
        const centerX = rect.width / 2 - (props.imageWrapperRef.current?.offsetLeft ?? 0);
        const centerY = rect.height / 2 - (props.imageWrapperRef.current?.offsetTop ?? 0);

        updateViewport((current) => {
            const newScale = Math.min(MAX_SCALE, current.scale * (1 + ZOOM_STEP));
            if (newScale !== current.scale) {
                return calculateZoomAtPoint(
                    current.scale,
                    current.translateX,
                    current.translateY,
                    newScale,
                    centerX,
                    centerY
                );
            }
            return {};
        });
    }, [updateViewport, props.containerRef]);

    const handleZoomOut = useCallback(() => {
        const container = props.containerRef.current;
        if (!container) {
            return;
        }

        const rect = container.getBoundingClientRect();
        const centerX = rect.width / 2 - (props.imageWrapperRef.current?.offsetLeft ?? 0);
        const centerY = rect.height / 2 - (props.imageWrapperRef.current?.offsetTop ?? 0);

        updateViewport((current) => {
            const newScale = Math.max(MIN_SCALE, current.scale / (1 + ZOOM_STEP));
            if (newScale !== current.scale) {
                return calculateZoomAtPoint(
                    current.scale,
                    current.translateX,
                    current.translateY,
                    newScale,
                    centerX,
                    centerY
                );
            }
            return {};
        });
    }, [updateViewport, props.containerRef]);

    const handleFitToView = useCallback(() => {
        updateViewport({
            scale: 1,
            translateX: 0,
            translateY: 0
        });
        setFitMode(InteractiveFitMode.FitView);
    }, [updateViewport, setFitMode]);

    const handleFitToWidth = useCallback(() => {
        updateViewport({
            scale: 1,
            translateX: 0,
            translateY: 0
        });
        setFitMode(InteractiveFitMode.FitWidth);
    }, [updateViewport, setFitMode]);

    const handleDownload = useCallback(() => {
        const link = document.createElement('a');
        link.target = '_blank';
        link.href = props.image.path;
        const filename = props.image.path.split('/').pop() || 'screenshot.png';
        link.download = filename;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, [props.image.path]);

    return (
        <div className={classNames(styles.toolbar, props.className)} data-toolbar>
            <Button
                view="flat"
                size="m"
                className={styles.toolbarButton}
                onClick={handleDownload}
                title="Download image"
            >
                <Icon data={ArrowDownToSquare} />
            </Button>
            <Button
                view="flat"
                size="m"
                className={styles.toolbarButton}
                onClick={handleFitToView}
                title="Fit to view"
            >
                <Icon data={SquareDashed} />
            </Button>
            <Button
                view="flat"
                size="m"
                className={styles.toolbarButton}
                onClick={handleFitToWidth}
                title="Fit to width"
            >
                <Icon data={ChevronsExpandToLines} />
            </Button>
            <Button
                view="flat"
                size="m"
                className={styles.toolbarButton}
                onClick={handleZoomIn}
                title="Zoom in"
            >
                <Icon data={Plus} />
            </Button>
            <Button
                view="flat"
                size="m"
                className={styles.toolbarButton}
                onClick={handleZoomOut}
                title="Zoom out"
            >
                <Icon data={Minus} />
            </Button>
        </div>
    );
}
