import React from 'react';
import Split from 'react-split';
import styles from './SplitViewLayout.module.css';

interface SplitViewLayoutProps {
    children?: React.ReactNode;
}

export function SplitViewLayout(props: SplitViewLayoutProps): JSX.Element {
    return <Split direction={'horizontal'} className={styles.split} minSize={0} snapOffset={350}>
        {props.children}
    </Split>;
}
