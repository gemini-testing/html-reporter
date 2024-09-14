import classNames from 'classnames';
import React, {ReactNode, useState} from 'react';

import {Screenshot} from '@/static/new-ui/components/Screenshot';
import {ImageFile} from '@/types';
import styles from './SwitchMode.module.css';

interface SwitchModeProps {
    expected: ImageFile;
    actual: ImageFile;
}

export function SwitchMode(props: SwitchModeProps): ReactNode {
    const {expected, actual} = props;
    const maxNaturalWidth = Math.max(expected.size.width, actual.size.width);
    const maxNaturalHeight = Math.max(expected.size.height, actual.size.height);

    const [showLeft, setShowLeft] = useState(true);
    const rightImageVisibility = showLeft ? 'visible' : 'hidden';
    const leftImageVisibility = !showLeft ? 'visible' : 'hidden';

    const onClickHandler = (): void=> {
        setShowLeft(!showLeft);
    };

    const wrapperStyle = {'--max-natural-width': maxNaturalWidth, '--max-natural-height': maxNaturalHeight} as React.CSSProperties;
    const leftImageStyle = {'--natural-height': expected.size.height, '--natural-width': expected.size.width, visibility: leftImageVisibility} as React.CSSProperties;
    const rightImageStyle = {'--natural-height': actual.size.height, '--natural-width': actual.size.width, visibility: rightImageVisibility} as React.CSSProperties;

    return <div className={styles.switchMode} onClick={onClickHandler} style={wrapperStyle}>
        <Screenshot containerClassName={styles.imageWrapper} imageClassName={styles.image} src={expected.path} containerStyle={leftImageStyle}/>
        <Screenshot containerClassName={classNames(styles.imageWrapper, styles.rightImageWrapper)} imageClassName={styles.image} src={actual.path} containerStyle={rightImageStyle}/>
    </div>;
}
