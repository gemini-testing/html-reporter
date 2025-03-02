import classNames from 'classnames';
import React, {ReactNode} from 'react';
import styles from './index.module.css';

interface PanelSectionProps {
    title: string;
    description?: ReactNode;
    children?: ReactNode;
}

export function PanelSection(props: PanelSectionProps): ReactNode {
    return <div>
        <div className={classNames('text-header-1')}>{props.title}</div>
        {props.description && <div className={styles.description}>{props.description}</div>}
        {props.children}
    </div>;
}
