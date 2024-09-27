import React from 'react';
import {ImageSize} from '@/types';

export const getImageSizeCssVars = (size: ImageSize): React.CSSProperties => ({
    '--natural-width': size.width,
    '--natural-height': size.height
} as React.CSSProperties);

export const getDisplayedDiffPercentValue = (diffRatio: number): string => {
    const percent = diffRatio * 100;
    const percentRounded = Math.ceil(percent * 100) / 100;
    const percentThreshold = 0.01;

    if (percent < percentThreshold) {
        return `< ${percentThreshold}`;
    }

    return String(percentRounded);
};
