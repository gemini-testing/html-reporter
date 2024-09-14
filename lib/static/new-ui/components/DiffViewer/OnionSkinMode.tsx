import classNames from 'classnames';
import React, {ReactNode, useState} from 'react';

import {Screenshot} from '@/static/new-ui/components/Screenshot';
import {ImageFile} from '@/types';
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
    const leftImageStyle = {'--natural-height': expected.size.height, '--natural-width': expected.size.width} as React.CSSProperties;
    const rightImageStyle = {'--natural-height': actual.size.height, '--natural-width': actual.size.width, opacity: rightImageOpacity} as React.CSSProperties;

    return <div style={wrapperStyle}>
        <div className={styles.imagesContainer}>
            <Screenshot containerClassName={styles.imageWrapper} imageClassName={styles.image} src={expected.path} containerStyle={leftImageStyle}/>
            <Screenshot containerClassName={classNames(styles.imageWrapper, styles.rightImageWrapper)} imageClassName={styles.image} src={actual.path} containerStyle={rightImageStyle}/>
        </div>
        <div className={styles.sliderContainer}>
            <Slider className={styles.slider} min={0} max={1} step={0.01} value={rightImageOpacity} onUpdate={onUpdateHandler} />
        </div>
    </div>;
}
