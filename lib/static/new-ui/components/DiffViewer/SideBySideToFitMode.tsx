import React, {ReactNode} from 'react';
import {Screenshot} from '@/static/new-ui/components/Screenshot';

import styles from './SideBySideToFitMode.module.css';
import {ScreenshotDisplayData} from './types';

interface SideBySideToFitModeProps {
    actual: ScreenshotDisplayData;
    diff: ScreenshotDisplayData;
    expected: ScreenshotDisplayData;
    /**
     * A valid CSS value assignable to height, e.g. `10px` or `calc(100vh - 50px)`.
     * Images will try to fit the `desiredHeight`, but will only shrink no more than 2 times.
     * */
    desiredHeight: string;
}

export function SideBySideToFitMode(props: SideBySideToFitModeProps): ReactNode {
    return <div className={styles.sideBySideToFitMode} style={{'--desired-height': props.desiredHeight} as React.CSSProperties}>
        <div className={styles.imageWrapper}>
            {props.expected.label}
            <Screenshot imageClassName={styles.image} src={props.expected.path} size={props.expected.size} />
        </div>
        <div className={styles.imageWrapper}>
            {props.actual.label}
            <Screenshot imageClassName={styles.image} src={props.actual.path} size={props.actual.size} />
        </div>
        <div className={styles.imageWrapper}>
            {props.diff.label}
            <Screenshot imageClassName={styles.image} src={props.diff.path} size={props.diff.size} diffClusters={props.diff.diffClusters}/>
        </div>
    </div>;
}
