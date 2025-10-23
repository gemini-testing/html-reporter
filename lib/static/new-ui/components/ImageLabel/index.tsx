import React, {ReactNode} from 'react';
import styles from './index.module.css';

interface ImageLabelProps {
    title: string;
    subtitle?: string;
}

export function ImageLabel({title, subtitle}: ImageLabelProps): ReactNode {
    return <div className={styles.imageLabel} data-testid={`image-label-${title.toLowerCase()}`}>
        <span>{title}</span>
        {subtitle && <span className={styles.imageLabelSubtitle}>{subtitle}</span>}
    </div>;
}
