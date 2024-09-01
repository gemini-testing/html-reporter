import React from 'react';
import classNames from 'classnames';

import styles from './index.module.css';

interface CardProps {
    className?: string;
    children?: React.ReactNode;
}

export function Card(props: CardProps): React.ReactNode {
    return <div className={classNames(styles.card, props.className)}>{props.children}</div>;
}
