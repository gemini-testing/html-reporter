import React, {ReactNode, useEffect, useRef} from 'react';

import styles from './index.module.css';
import {useSelector} from 'react-redux';
import {getTotalLoadingProgress} from '@/static/new-ui/app/selectors';
import {State} from '@/static/new-ui/types/store';
import classNames from 'classnames';

export function LoadingBar(): ReactNode {
    const isLoaded = useSelector((state: State) => state.app.isInitialized);
    const isLoadedRef = useRef(isLoaded);
    const progress = useSelector(getTotalLoadingProgress);

    const [hidden, setHidden] = React.useState(true);

    // Delay is needed for smoother experience: when loading is fast, it prevents notification bar from appearing and
    // hiding immediately. When loading a lot of data, it helps avoid freezes when everything is loaded.
    useEffect(() => {
        isLoadedRef.current = isLoaded;
        const timeoutId = setTimeout(() => {
            if (isLoaded === isLoadedRef.current) {
                setHidden(isLoaded);
            }
        }, 500);

        return () => clearTimeout(timeoutId);
    }, [isLoaded]);

    return <div className={classNames(styles.container, {[styles.hidden]: hidden})}>
        <div className={styles.messageContainer}>
            <div className={styles.message}>
                <span>Loading Testplane UI</span>
                <div className={styles.loader}></div>
            </div>
        </div>
        <div className={styles.progressContainer} style={{width: `${progress * 100}%`}}>
            <div className={styles.progressPulse}></div>
        </div>
    </div>;
}
