import React from 'react';
import classNames from 'classnames';

import styles from './index.module.css';

export interface CardProps {
    className?: string;
    children?: React.ReactNode;
}

export function Card(props: CardProps): React.ReactNode {
    return <div className={styles.wrapper}>
        <div className={classNames(styles.commonCard, styles.card, props.className)}>
            {props.children}
        </div>
    </div>;
}
