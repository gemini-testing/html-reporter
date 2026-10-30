import React, {ReactNode} from 'react';
import classnames from 'classnames';
import {Screenshot} from '@/static/new-ui/components/Screenshot';

import styles from './SideBySideMode.module.css';
import {ScreenshotDisplayData} from './types';
import {getImageSizeCssVars} from '@/static/new-ui/components/DiffViewer/utils';

interface SideBySideToFitModeProps {
    actual: ScreenshotDisplayData;
    diff: ScreenshotDisplayData;
    expected: ScreenshotDisplayData;
    magnifier?: React.RefObject<HTMLElement | null>;
}

export function SideBySideMode(props: SideBySideToFitModeProps): ReactNode {
    const {expected, actual, diff, magnifier} = props;

    return <div className={styles.sideBySideMode}>
        <div className={classnames(styles.imageWrapper, 'can-hide')} style={getImageSizeCssVars(expected.size)}>
            {expected.label}
            <Screenshot stopClickPropagation={false} image={expected} containerClassName={classnames(styles.imageContainer, 'image-outline-sbs')} magnifier={magnifier} />
        </div>
        <div className={classnames(styles.imageWrapper, 'can-hide')} style={getImageSizeCssVars(actual.size)}>
            {actual.label}
            <Screenshot stopClickPropagation={false} image={actual} containerClassName={classnames(styles.imageContainer, 'image-outline-sbs', 'actual')} magnifier={magnifier} />
        </div>
        <div className={styles.imageWrapper} style={getImageSizeCssVars(diff.size)}>
            {diff.label}
            <Screenshot image={diff} diffClusters={diff.diffClusters} containerClassName={classnames(styles.imageContainer, 'image-outline-sbs')} magnifier={magnifier} />
        </div>
    </div>;
}
