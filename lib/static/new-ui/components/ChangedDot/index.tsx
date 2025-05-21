import React from 'react';
import styles from './index.module.css';
import classNames from 'classnames';

interface ChangedDotProps {
    className?: string;
}

export function ChangedDot({className}: ChangedDotProps): React.ReactElement {
    return <div className={classNames(styles.dot, className)}></div>;
}
