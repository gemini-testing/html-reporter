import React, {ReactNode} from 'react';

import cardStyles from './index.module.css';
import styles from './AnimatedAppearCard.module.css';
import classNames from 'classnames';
import {useSelector} from 'react-redux';

export function AnimatedAppearCard(): ReactNode {
    const isInitialized = useSelector(state => state.app.isInitialized);

    return <div className={classNames(cardStyles.commonCard, styles.animatedAppearCard, {[styles.hidden]: isInitialized})}>
        <div className={styles.backgroundOverlay}></div>
    </div>;
}
