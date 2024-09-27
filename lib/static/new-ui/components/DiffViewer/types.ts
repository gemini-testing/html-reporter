import {ReactNode} from 'react';
import {CoordBounds} from 'looks-same';

import {ImageFile} from '@/types';

export interface ScreenshotDisplayData extends ImageFile {
    label?: ReactNode;
    diffClusters?: CoordBounds[];
}
