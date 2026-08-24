import React, {ReactNode} from 'react';
import classnames from 'classnames';
import {Screenshot} from '@/static/new-ui/components/Screenshot';

import styles from './SideBySideToFitMode.module.css';
import {ScreenshotDisplayData} from './types';
import {getImageSizeCssVars} from '@/static/new-ui/components/DiffViewer/utils';

interface SideBySideToFitModeProps {
    expected: ScreenshotDisplayData;
    actual: ScreenshotDisplayData;
    diff: ScreenshotDisplayData;
    /**
     * A valid CSS value assignable to height, e.g. `10px` or `calc(100vh - 50px)`.
     * Images will try to fit the `desiredHeight`, but will only shrink no more than 2 times.
     * */
    desiredHeight: string;
    magnifier?: React.RefObject<HTMLElement>;
}

export function SideBySideToFitMode(props: SideBySideToFitModeProps): ReactNode {
    const {expected, actual, diff, magnifier} = props;

    return <div className={styles.sideBySideToFitMode} style={{'--desired-height': props.desiredHeight} as React.CSSProperties}>
        <div className={classnames(styles.imageWrapper, 'can-hide')} style={getImageSizeCssVars(expected.size)}>
            {expected.label}
            <Screenshot stopClickPropagation={false} imageClassName={styles.image} image={expected} containerClassName={classnames(styles.imageContainer, 'image-outline-sbs')} magnifier={magnifier} />
        </div>
        <div className={classnames(styles.imageWrapper, 'can-hide')} style={getImageSizeCssVars(actual.size)}>
            {actual.label}
            <Screenshot stopClickPropagation={false} imageClassName={styles.image} image={actual} containerClassName={classnames(styles.imageContainer, 'image-outline-sbs', 'actual')} magnifier={magnifier} />
        </div>
        <div className={styles.imageWrapper} style={getImageSizeCssVars(diff.size)}>
            {diff.label}
            <Screenshot imageClassName={styles.image} image={diff} diffClusters={diff.diffClusters} containerClassName={classnames(styles.imageContainer, 'image-outline-sbs')} magnifier={magnifier} />
        </div>
    </div>;
}
