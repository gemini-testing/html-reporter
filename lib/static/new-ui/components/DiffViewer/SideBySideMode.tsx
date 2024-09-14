import React, {ReactNode} from 'react';
import {Screenshot} from '@/static/new-ui/components/Screenshot';

import styles from './SideBySideMode.module.css';
import {ScreenshotDisplayData} from './types';

interface SideBySideToFitModeProps {
    actual: ScreenshotDisplayData;
    diff: ScreenshotDisplayData;
    expected: ScreenshotDisplayData;
}

export function SideBySideMode(props: SideBySideToFitModeProps): ReactNode {
    return <div className={styles.sideBySideMode}>
        <div className={styles.imageWrapper}>
            {props.expected.label}
            <Screenshot image={props.expected} />
        </div>
        <div className={styles.imageWrapper}>
            {props.actual.label}
            <Screenshot image={props.actual}/>
        </div>
        <div className={styles.imageWrapper}>
            {props.diff.label}
            <Screenshot image={props.diff} diffClusters={props.diff.diffClusters}/>
        </div>
    </div>;
}
