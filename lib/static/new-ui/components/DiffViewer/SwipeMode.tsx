import {ChevronLeft, ChevronRight} from '@gravity-ui/icons';
import classNames from 'classnames';
import {clamp} from 'lodash';
import React, {MouseEventHandler, ReactNode, useEffect, useRef, useState} from 'react';

import {Screenshot} from '@/static/new-ui/components/Screenshot';
import {ImageFile} from '@/types';
import styles from './SwipeMode.module.css';

interface SwitchModeProps {
    expected: ImageFile;
    actual: ImageFile;
}

export function SwipeMode(props: SwitchModeProps): ReactNode {
    const {expected, actual} = props;
    const maxNaturalWidth = Math.max(expected.size.width, actual.size.width);
    const maxNaturalHeight = Math.max(expected.size.height, actual.size.height);

    const swipeContainer = useRef<HTMLDivElement>(null);
    const [dividerPosition, setDividerPosition] = useState(0);
    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
        if (swipeContainer.current) {
            setDividerPosition(swipeContainer.current.getBoundingClientRect().width / 2);
        }
    }, [swipeContainer]);

    const updateDividerPosition = (e: Pick<MouseEvent, 'pageX'>): void => {
        const swipeContainerLeft = swipeContainer.current?.getBoundingClientRect().left ?? 0;
        const newMousePosX = e.pageX - swipeContainerLeft - window.scrollX;

        setDividerPosition(clamp(newMousePosX, 0, maxNaturalWidth));
    };

    const handleMouseMove = (e: MouseEvent): void => {
        updateDividerPosition(e);
    };

    const handleMouseUp = (): void => {
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('mousemove', handleMouseMove);

        setIsDragging(false);
    };

    const handleMouseDown: MouseEventHandler = (e) => {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        setIsDragging(true);
        updateDividerPosition(e);
    };

    const wrapperStyle = {'--max-natural-width': maxNaturalWidth, '--max-natural-height': maxNaturalHeight} as React.CSSProperties;

    return <div className={classNames(styles.swipeMode, {[styles.isDragging]: isDragging})} style={wrapperStyle} ref={swipeContainer} onMouseDown={handleMouseDown}>
        <div className={styles.leftSection} style={{width: dividerPosition}}>
            <Screenshot containerClassName={styles.imageWrapper} imageClassName={styles.image} image={expected} />
        </div>
        <div className={styles.divider}>
            <div className={styles.dividerIcons}>
                <ChevronLeft/>
                <ChevronRight/>
            </div>
        </div>
        <Screenshot containerClassName={classNames(styles.imageWrapper, styles.rightSection)} imageClassName={styles.image} image={actual} />
    </div>;
}
