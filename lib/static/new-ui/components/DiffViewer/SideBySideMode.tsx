import React, {ReactNode} from 'react';
import {Screenshot} from '@/static/new-ui/components/Screenshot';

import styles from './SideBySideMode.module.css';
import {ScreenshotDisplayData} from './types';
import {getImageSizeCssVars} from '@/static/new-ui/components/DiffViewer/utils';

interface SideBySideToFitModeProps {
    actual: ScreenshotDisplayData;
    diff: ScreenshotDisplayData;
    expected: ScreenshotDisplayData;
}

export function SideBySideMode(props: SideBySideToFitModeProps): ReactNode {
    const {expected, actual, diff} = props;

    return <div className={styles.sideBySideMode}>
        <div className={styles.imageWrapper} style={getImageSizeCssVars(expected.size)}>
            {expected.label}
            <Screenshot image={expected} />
        </div>
        <div className={styles.imageWrapper} style={getImageSizeCssVars(actual.size)}>
            {actual.label}
            <Screenshot image={actual}/>
        </div>
        <div className={styles.imageWrapper} style={getImageSizeCssVars(diff.size)}>
            {diff.label}
            <Screenshot image={diff} diffClusters={diff.diffClusters}/>
        </div>
    </div>;
}
