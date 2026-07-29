import React, {ReactNode} from 'react';
import classNames from 'classnames';
import {Screenshot} from '@/static/new-ui/components/Screenshot';

import styles from './ListMode.module.css';
import {ScreenshotDisplayData} from '@/static/new-ui/components/DiffViewer/types';

interface SideBySideToFitModeProps {
    actual: ScreenshotDisplayData;
    diff: ScreenshotDisplayData;
    expected: ScreenshotDisplayData;
    magnifier?: React.RefObject<HTMLElement>;
}

export function ListMode(props: SideBySideToFitModeProps): ReactNode {
    return <div className={styles.listMode}>
        <div>
            {props.expected.label}
            <Screenshot stopClickPropagation={false} image={props.expected} containerClassName={styles.imageContainer} magnifier={props.magnifier}/>
        </div>
        <div>
            {props.actual.label}
            <Screenshot stopClickPropagation={false} image={props.actual} containerClassName={classNames(styles.imageContainer, 'image-outline')} magnifier={props.magnifier}/>
        </div>
        <div>
            {props.diff.label}
            <Screenshot image={props.diff} diffClusters={props.diff.diffClusters} containerClassName={styles.imageContainer} magnifier={props.magnifier}/>
        </div>
    </div>;
}
