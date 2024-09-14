import React from 'react';
import {ImageSize} from '@/types';

export const getImageSizeCssVars = (size: ImageSize): React.CSSProperties => ({
    '--natural-width': size.width,
    '--natural-height': size.height
} as React.CSSProperties);
