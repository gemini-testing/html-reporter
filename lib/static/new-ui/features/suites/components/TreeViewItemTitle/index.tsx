import React from 'react';
import {TreeViewData, TreeViewItemType} from '@/static/new-ui/features/suites/components/SuitesPage/types';
import styles from './index.module.css';

export function TreeViewItemTitle(props: {item: TreeViewData}): React.JSX.Element {
    return <div>
        <span>{props.item.title}</span>
        {
            props.item.type === TreeViewItemType.Browser &&
            props.item.errorTitle &&
            <span className={styles['tree-view-item__error-title']}>{props.item.errorTitle}</span>
        }
    </div>;
}
