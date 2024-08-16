import React, {ReactNode} from 'react';
import {TreeViewData, TreeViewItemType} from '@/static/new-ui/features/suites/components/SuitesPage/types';
import styles from './index.module.css';
import {ImageWithMagnifier} from '@/static/new-ui/components/ImageWithMagnifier';

export function TreeViewItemSubtitle(props: {item: TreeViewData}): ReactNode {
    if (props.item.type === TreeViewItemType.Browser && props.item.diffImg) {
        return <ImageWithMagnifier src={props.item.diffImg.path} alt={'diff-image'} style={{maxWidth: '99%', marginTop: '4px', maxHeight: '40vh'}} />;
    } else if (props.item.type === TreeViewItemType.Browser && props.item.errorStack) {
        return <div className={styles['tree-view-item-subtitle__error-stack']}>
            {props.item.errorStack}
        </div>;
    }

    return null;
}
