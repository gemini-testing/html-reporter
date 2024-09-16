import classNames from 'classnames';
import React, {ReactNode} from 'react';

import cardStyles from './index.module.css';
import styles from './KeepDraggingToHideCard.module.css';

export function KeepDraggingToHideCard(): ReactNode {
    return <div className={classNames(cardStyles.commonCard, styles.overlayContainer)}>
        <div className={styles.pulsing}></div>
        <span className={styles.hint}>Keep dragging to hide</span>
    </div>;
}
