import {Divider} from '@gravity-ui/uikit';
import classNames from 'classnames';
import React, {ReactNode} from 'react';

import styles from './index.module.css';

interface AsidePanelProps {
    title: string;
    children?: ReactNode;
    className?: string;
}

export function AsidePanel(props: AsidePanelProps): ReactNode {
    return <div className={classNames(styles.container, props.className)}>
        <h2 className={classNames('text-display-1')}>{props.title}</h2>
        <Divider className={styles.divider} orientation={'horizontal'} />
        {props.children}
    </div>;
}
