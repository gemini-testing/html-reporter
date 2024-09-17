import {CoordBounds} from 'looks-same';
import React, {RefObject, useImperativeHandle, useState} from 'react';

import {CIRCLE_RADIUS} from '@/constants';
import {ImageSize} from '@/types';
import styles from './DiffCircle.module.css';

interface DiffCircleProps {
    diffImageOriginalSize: ImageSize;
    diffImageRef: RefObject<HTMLElement>;
    diffCluster: CoordBounds;
}

export interface DiffCircleHandle {
    pulse: () => void;
}

export const DiffCircle = React.forwardRef<DiffCircleHandle, DiffCircleProps>(function DiffCircle(props, ref) {
    const [animation, setAnimation] = useState(false);

    useImperativeHandle(ref, () => ({
        pulse: (): void => {
            setAnimation(false);
            window.requestAnimationFrame(() => setAnimation(true));
        }
    }));

    const {diffImageOriginalSize, diffCluster, diffImageRef} = props;

    if (!animation || !diffImageRef.current) {
        return null;
    }

    const originalImageWidth = diffImageOriginalSize.width;
    const targetRect = diffImageRef.current.getBoundingClientRect();
    const sizeCoeff = diffImageRef.current.offsetWidth / originalImageWidth;

    const rectHeight = Math.ceil(sizeCoeff * (diffCluster.bottom - diffCluster.top + 1));
    const rectWidth = Math.ceil(sizeCoeff * (diffCluster.right - diffCluster.left + 1));

    const rectMiddleX = (diffCluster.left + diffCluster.right) / 2;
    const rectMiddleY = (diffCluster.top + diffCluster.bottom) / 2;

    const x = targetRect.left + sizeCoeff * rectMiddleX;
    const y = targetRect.top + sizeCoeff * rectMiddleY;
    const minSize = Math.floor(Math.sqrt(rectWidth * rectWidth + rectHeight * rectHeight));

    const diffCircle = {
        width: `${minSize}px`,
        height: `${minSize}px`,
        top: `${Math.ceil(y - minSize / 2)}px`,
        left: `${Math.ceil(x - minSize / 2)}px`
    };
    const radius = minSize + CIRCLE_RADIUS;

    return (
        <div
            className={styles.diffCircle}
            style={{'--diff-bubbles-scale': radius / minSize, animation: 'diff-bubbles 1s ease-out forwards', ...diffCircle} as React.CSSProperties}
            onAnimationEnd={(): void => setAnimation(false)}
        >
        </div>
    );
});
