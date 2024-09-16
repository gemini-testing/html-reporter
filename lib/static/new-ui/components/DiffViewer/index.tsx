import {ImageFile} from '@/types';
import {CoordBounds} from 'looks-same';
import {DiffModeId, DiffModes} from '@/constants';
import React, {ReactNode} from 'react';
import {OnlyDiffMode} from '@/static/new-ui/components/DiffViewer/OnlyDiffMode';
import {SwitchMode} from '@/static/new-ui/components/DiffViewer/SwitchMode';
import {SwipeMode} from '@/static/new-ui/components/DiffViewer/SwipeMode';
import {OnionSkinMode} from '@/static/new-ui/components/DiffViewer/OnionSkinMode';
import {SideBySideMode} from '@/static/new-ui/components/DiffViewer/SideBySideMode';
import {SideBySideToFitMode} from '@/static/new-ui/components/DiffViewer/SideBySideToFitMode';
import {ListMode} from '@/static/new-ui/components/DiffViewer/ListMode';
import {getDisplayedDiffPercentValue} from '@/static/new-ui/components/DiffViewer/utils';

import styles from './index.module.css';

interface DiffViewerProps {
    actualImg: ImageFile;
    expectedImg: ImageFile;
    diffImg: ImageFile;
    diffClusters: CoordBounds[];
    diffMode: DiffModeId;
    /** For cosmetics, will be displayed in diff label. */
    differentPixels?: number;
    /** For cosmetics, will be displayed in diff label. */
    diffRatio?: number;
    /**
     * A valid CSS value assignable to height, e.g. `10px` or `calc(100vh - 50px)`.
     * Images will try to fit the `desiredHeight`, but will only shrink no more than 2 times.
     * */
    desiredHeight?: string;
}

export function DiffViewer(props: DiffViewerProps): ReactNode {
    const getImageDisplayedSize = (image: ImageFile): string => `${image.size.width}×${image.size.height}`;
    const getImageLabel = (title: string, subtitle?: string): ReactNode => {
        return <div className={styles.imageLabel}>
            <span>{title}</span>
            {subtitle && <span className={styles.imageLabelSubtitle}>{subtitle}</span>}
        </div>;
    };

    const expectedImg = Object.assign({}, props.expectedImg, {
        label: getImageLabel('Expected', getImageDisplayedSize(props.expectedImg))
    });
    const actualImg = Object.assign({}, props.actualImg, {
        label: getImageLabel('Actual', getImageDisplayedSize(props.actualImg))
    });
    let diffSubtitle: string | undefined;
    if (props.differentPixels !== undefined && props.diffRatio !== undefined) {
        diffSubtitle = `${props.differentPixels}px ⋅ ${getDisplayedDiffPercentValue(props.diffRatio)}%`;
    }
    const diffImg = Object.assign({}, props.diffImg, {
        label: getImageLabel('Diff', diffSubtitle),
        diffClusters: props.diffClusters
    });

    switch (props.diffMode) {
        case DiffModes.ONLY_DIFF.id:
            return <OnlyDiffMode diff={diffImg} />;

        case DiffModes.SWITCH.id:
            return <SwitchMode expected={expectedImg} actual={actualImg} />;

        case DiffModes.SWIPE.id:
            return <SwipeMode expected={expectedImg} actual={actualImg} />;

        case DiffModes.ONION_SKIN.id:
            return <OnionSkinMode expected={expectedImg} actual={actualImg} />;

        case DiffModes.THREE_UP_SCALED.id:
            return <SideBySideMode actual={actualImg} diff={diffImg} expected={expectedImg} />;

        case DiffModes.THREE_UP_SCALED_TO_FIT.id: {
            const desiredHeight = props.desiredHeight ?? 'calc(100vh - 180px)';

            return <SideBySideToFitMode desiredHeight={desiredHeight} actual={actualImg} diff={diffImg} expected={expectedImg} />;
        }
        case DiffModes.THREE_UP.id:
        default:
            return <ListMode actual={actualImg} diff={diffImg} expected={expectedImg} />;
    }
}
