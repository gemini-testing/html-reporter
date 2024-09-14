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

    const [showExpected, setShowExpected] = useState(true);
    const actualImageVisibility = showExpected ? 'visible' : 'hidden';
    const expectedImageVisibility = !showExpected ? 'visible' : 'hidden';

    const onClickHandler = (): void=> {
        setShowExpected(!showExpected);
    };

    const wrapperStyle = {'--max-natural-width': maxNaturalWidth, '--max-natural-height': maxNaturalHeight} as React.CSSProperties;
    const expectedImageStyle: React.CSSProperties = {visibility: expectedImageVisibility};
    const actualImageStyle: React.CSSProperties = {visibility: actualImageVisibility};

    return <div className={styles.switchMode} onClick={onClickHandler} style={wrapperStyle}>
        <Screenshot containerClassName={styles.imageWrapper} imageClassName={styles.image} image={expected} containerStyle={expectedImageStyle} />
        <Screenshot containerClassName={classNames(styles.imageWrapper, styles.rightImageWrapper)} imageClassName={styles.image} image={actual} containerStyle={actualImageStyle} />
    </div>;
}
