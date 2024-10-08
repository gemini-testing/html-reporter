import React from 'react';
import {TreeViewData, TreeViewItemType} from '@/static/new-ui/features/suites/components/SuitesPage/types';
import styles from './index.module.css';
import classNames from 'classnames';

interface TreeViewItemTitleProps {
    className?: string;
    item: TreeViewData;
}

export function TreeViewItemTitle(props: TreeViewItemTitleProps): React.JSX.Element {
    return <div>
        <span>{props.item.title}</span>
        {
            props.item.type === TreeViewItemType.Browser &&
            props.item.errorTitle &&
            <span className={classNames(styles['tree-view-item__error-title'], props.className)}>{props.item.errorTitle}</span>
        }
    </div>;
}
