import React, {ReactNode} from 'react';
import {ImageEntity} from '@/static/new-ui/types/store';
import styles from './index.module.css';
import {getAssertViewStatusIcon, getAssertViewStatusMessage} from '@/static/new-ui/utils/assert-view-status';

interface AssertViewStatusProps {
    image: ImageEntity | null;
}

export function AssertViewStatus({image}: AssertViewStatusProps): ReactNode {
    return <div className={styles.container}>{getAssertViewStatusIcon(image)}<span>{getAssertViewStatusMessage(image)}</span></div>;
}
