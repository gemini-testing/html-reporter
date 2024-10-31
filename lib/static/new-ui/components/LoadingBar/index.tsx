import React, {ReactNode, useEffect, useRef} from 'react';

import styles from './index.module.css';
import {useSelector} from 'react-redux';
import {getTotalLoadingProgress} from '@/static/new-ui/app/selectors';
import {State} from '@/static/new-ui/types/store';
import classNames from 'classnames';

export function LoadingBar(): ReactNode {
    const isVisible = useSelector((state: State) => state.app.loading.isVisible);
    const isInProgress = useSelector((state: State) => state.app.loading.isInProgress);
    const isVisibleRef = useRef(isVisible);
    const progress = useSelector(getTotalLoadingProgress);
    const taskTitle = useSelector((state: State) => state.app.loading.taskTitle);

    const [hidden, setHidden] = React.useState(true);

    // Delay is needed for smoother experience: when loading is fast, it prevents notification bar from appearing and
    // hiding immediately. When loading a lot of data, it helps avoid freezes when everything is loaded.
    useEffect(() => {
        isVisibleRef.current = isVisible;
        const timeoutId = setTimeout(() => {
            if (isVisible === isVisibleRef.current) {
                setHidden(!isVisible);
            }
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [isVisible]);

    return <div className={classNames(styles.container, {[styles.hidden]: hidden})}>
        <div className={styles.messageContainer}>
            <div className={styles.message}>
                <span>{taskTitle}</span>
                {isInProgress && <div className={styles.loader}></div>}
            </div>
        </div>
        <div className={styles.progressContainer} style={{width: `${progress * 100}%`}}>
            <div className={styles.progressPulse}></div>
        </div>
    </div>;
}
