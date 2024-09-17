import React, {ReactNode} from 'react';
import {Screenshot} from '@/static/new-ui/components/Screenshot';

import styles from './ListMode.module.css';
import {ScreenshotDisplayData} from '@/static/new-ui/components/DiffViewer/types';

interface SideBySideToFitModeProps {
    actual: ScreenshotDisplayData;
    diff: ScreenshotDisplayData;
    expected: ScreenshotDisplayData;
}

export function ListMode(props: SideBySideToFitModeProps): ReactNode {
    return <div className={styles.listMode}>
        <div>
            {props.expected.label}
            <Screenshot image={props.expected} />
        </div>
        <div>
            {props.actual.label}
            <Screenshot image={props.actual} />
        </div>
        <div>
            {props.diff.label}
            <Screenshot image={props.diff} diffClusters={props.diff.diffClusters}/>
        </div>
    </div>;
}
