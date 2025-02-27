import React, {ReactNode} from 'react';
import {Switch} from '@gravity-ui/uikit';

import styles from './index.module.css';

interface NamedSwitchProps {
    title: string;
    description?: string;
    checked: boolean;
    onUpdate?: (value: boolean) => void;
}

export function NamedSwitch(props: NamedSwitchProps): ReactNode {
    return <div className={styles.container}>
        <div className={styles.textContainer}>
            <div className={styles.title}>{props.title}</div>
            {props.description && <div className={styles.description}>{props.description}</div>}
        </div>
        <Switch checked={props.checked} onUpdate={props.onUpdate} />
    </div>;
}
