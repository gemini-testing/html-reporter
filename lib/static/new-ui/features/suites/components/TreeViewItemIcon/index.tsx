import React, {ReactNode} from 'react';
import {TestStatus} from '@/constants';
import {getIconByStatus} from '@/static/new-ui/utils';

import styles from './index.module.css';

interface TreeViewItemIconProps {
    status: TestStatus;
}

export function TreeViewItemIcon(props: TreeViewItemIconProps): ReactNode {
    return <div className={styles.wrapper}>{getIconByStatus(props.status)}</div>;
}
