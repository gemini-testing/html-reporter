import classNames from 'classnames';
import React, {ReactNode, useState} from 'react';

import {Screenshot} from '@/static/new-ui/components/Screenshot';
import {ImageFile} from '@/types';
import commonStyles from './common.module.css';
import styles from './SwitchMode.module.css';

interface SwitchModeProps {
    expected: ImageFile;
    actual: ImageFile;
}

export function SwitchMode(props: SwitchModeProps): ReactNode {
    const {expected, actual} = props;
    const maxNaturalWidth = Math.max(expected.size.width, actual.size.width);
    const maxNaturalHeight = Math.max(expected.size.height, actual.size.height);

    const [isExpectedHidden, setIsExpectedHidden] = useState(true);

    const onClickHandler = (): void=> {
        setIsExpectedHidden(!isExpectedHidden);
    };

    const wrapperStyle = {'--max-natural-width': maxNaturalWidth, '--max-natural-height': maxNaturalHeight} as React.CSSProperties;

    return <div className={classNames(commonStyles.imagesContainer, styles.switchMode)} onClick={onClickHandler} style={wrapperStyle}>
        <Screenshot containerClassName={classNames(commonStyles.screenshotContainer, {[styles['image--hidden']]: isExpectedHidden})} imageClassName={styles.image} image={expected} />
        <Screenshot containerClassName={classNames(commonStyles.screenshotContainer, styles.screenshotContainer, {[styles['image--hidden']]: !isExpectedHidden})} imageClassName={styles.image} image={actual} />
    </div>;
}
