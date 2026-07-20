import React, {ReactNode} from 'react';
import classNames from 'classnames';

import styles from './index.module.css';

interface ImageLabelProps {
    title: string;
    subtitle?: string;
    className?: string;
}

export function ImageLabel({title, subtitle, className}: ImageLabelProps): ReactNode {
    return <div className={classNames(styles.imageLabel, className)} data-testid={`image-label-${title.toLowerCase()}`}>
        <span>{title}</span>
        {subtitle && <span className={styles.imageLabelSubtitle}>{subtitle}</span>}
    </div>;
}
