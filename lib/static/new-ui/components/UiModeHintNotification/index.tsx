import {createPortal} from 'react-dom';
import React, {ReactNode} from 'react';
import {ArrowLeft, Xmark} from '@gravity-ui/icons';

import styles from './index.module.css';
import classNames from 'classnames';

interface HintNotificationProps {
    isVisible: boolean | null;
    onClose?: () => unknown;
}

export function UiModeHintNotification(props: HintNotificationProps): ReactNode {
    return createPortal(<div className={classNames(styles.container, {
        [styles.visible]: props.isVisible,
        [styles.hidden]: props.isVisible === false
    })}>
        <ArrowLeft className={styles.arrow}/>
        <div className={styles.hintTitle}>Hint</div>
        <svg viewBox="0 0 2 2" height={2}>
            <circle r="1" cx="1" cy="1"></circle>
        </svg>
        <div>You can always switch back to the old UI in Settings</div>
        <Xmark className={styles.closeButton} onClick={(): unknown => props.onClose?.()}/>
    </div>, document.body);
}
