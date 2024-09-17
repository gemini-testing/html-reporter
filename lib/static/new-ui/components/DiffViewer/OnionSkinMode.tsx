import classNames from 'classnames';
import React, {ReactNode, useState} from 'react';

import {Screenshot} from '@/static/new-ui/components/Screenshot';
import {ImageFile} from '@/types';
import commonStyles from './common.module.css';
import styles from './OnionSkinMode.module.css';
import {Slider} from '@gravity-ui/uikit';

interface OnionSkinModeProps {
    expected: ImageFile;
    actual: ImageFile;
}

export function OnionSkinMode(props: OnionSkinModeProps): ReactNode {
    const {expected, actual} = props;
    const maxNaturalWidth = Math.max(expected.size.width, actual.size.width);
    const maxNaturalHeight = Math.max(expected.size.height, actual.size.height);

    const [rightImageOpacity, setRightImageOpacity] = useState(0.5);

    const onUpdateHandler = (value: number | [number, number]): void=> {
        setRightImageOpacity(value as number);
    };

    const wrapperStyle = {'--max-natural-width': maxNaturalWidth, '--max-natural-height': maxNaturalHeight} as React.CSSProperties;
    const actualImageStyle: React.CSSProperties = {opacity: rightImageOpacity};

    return <div style={wrapperStyle}>
        <div className={classNames(commonStyles.imagesContainer, styles.onionSkin)}>
            <Screenshot containerClassName={commonStyles.screenshotContainer} imageClassName={styles.image} image={expected} />
            <Screenshot containerClassName={classNames(commonStyles.screenshotContainer, styles['image-wrapper--actual'])} imageClassName={styles.image} image={actual} style={actualImageStyle} />
        </div>
        <div className={styles.sliderContainer}>
            <Slider className={styles.slider} min={0} max={1} step={0.01} value={rightImageOpacity} onUpdate={onUpdateHandler} />
        </div>
    </div>;
}
