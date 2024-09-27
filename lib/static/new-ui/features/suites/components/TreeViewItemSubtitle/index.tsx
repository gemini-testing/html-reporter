import React, {ReactNode} from 'react';
import {TreeViewData, TreeViewItemType} from '@/static/new-ui/features/suites/components/SuitesPage/types';
import styles from './index.module.css';
import {ImageWithMagnifier} from '@/static/new-ui/components/ImageWithMagnifier';
import classNames from 'classnames';

interface TreeViewItemSubtitleProps {
    item: TreeViewData;
    className?: string;
    // Passed to image with magnifier to detect parent container scrolling and update magnifier position
    scrollContainerRef: React.RefObject<HTMLElement>;
}

export function TreeViewItemSubtitle(props: TreeViewItemSubtitleProps): ReactNode {
    if (props.item.type === TreeViewItemType.Browser && props.item.diffImg) {
        return <ImageWithMagnifier src={props.item.diffImg.path} alt={'diff-image'} style={{maxWidth: '99%', marginTop: '4px', maxHeight: '40vh'}} scrollContainerRef={props.scrollContainerRef} />;
    } else if (props.item.type === TreeViewItemType.Browser && props.item.errorStack) {
        return <div className={classNames(styles['tree-view-item-subtitle__error-stack'], props.className)}>
            {props.item.errorStack}
        </div>;
    }

    return null;
}
