import React, {ReactNode} from 'react';

import styles from './index.module.css';

interface TreeViewItemIconProps {
    children: ReactNode;
}

export function TreeViewItemIcon(props: TreeViewItemIconProps): ReactNode {
    return <div className={styles.wrapper}>{props.children}</div>;
}
