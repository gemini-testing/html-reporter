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
            <Screenshot src={props.expected.path} size={props.expected.size}/>
        </div>
        <div>
            {props.actual.label}
            <Screenshot src={props.actual.path} size={props.actual.size}/>
        </div>
        <div>
            {props.diff.label}
            <Screenshot src={props.diff.path} size={props.diff.size} diffClusters={props.diff.diffClusters}/>
        </div>
    </div>;
}
