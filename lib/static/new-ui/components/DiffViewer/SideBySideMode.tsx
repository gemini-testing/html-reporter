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
            <Screenshot src={props.expected.path} size={props.expected.size}/>
        </div>
        <div className={styles.imageWrapper}>
            {props.actual.label}
            <Screenshot src={props.actual.path} size={props.actual.size}/>
        </div>
        <div className={styles.imageWrapper}>
            {props.diff.label}
            <Screenshot src={props.diff.path} size={props.diff.size} diffClusters={props.diff.diffClusters}/>
        </div>
    </div>;
}
