import classNames from 'classnames';
import React, {ReactNode} from 'react';
import stripAnsi from 'strip-ansi';

import {TreeViewItemData} from '@/static/new-ui/features/suites/components/SuitesPage/types';
import {ImageWithMagnifier} from '@/static/new-ui/components/ImageWithMagnifier';
import {ImageEntityFail} from '@/static/new-ui/types/store';
import styles from './index.module.css';
import {getAssertViewStatusMessage} from '@/static/new-ui/utils/assert-view-status';
import {makeLinksClickable} from '@/static/new-ui/utils';
import {TestStatus} from '@/constants';

interface TreeViewItemSubtitleProps {
    item: TreeViewItemData;
    className?: string;
    // Passed to image with magnifier to detect parent container scrolling and update magnifier position
    scrollContainerRef: React.RefObject<HTMLElement>;
}

export function TreeViewItemSubtitle(props: TreeViewItemSubtitleProps): ReactNode {
    if (props.item.status === TestStatus.SKIPPED && props.item.skipReason) {
        return <div className={styles.skipReasonContainer}>
            <div className={styles.skipReason}>Skipped ⋅ {makeLinksClickable(props.item.skipReason)}</div>
        </div>;
    } else if (props.item.images?.length) {
        return <div>
            {props.item.images.map((imageEntity, index) => {
                const image = (imageEntity as ImageEntityFail).diffImg ?? (imageEntity as ImageEntityFail).actualImg;
                if (!image) {
                    return;
                }

                return <div key={index}>
                    <span className={styles.imageStatus}>{(imageEntity as ImageEntityFail).stateName} ⋅ {getAssertViewStatusMessage(imageEntity)}</span>
                    <ImageWithMagnifier image={image} style={{maxWidth: '99%', marginTop: '4px', maxHeight: '40vh'}} scrollContainerRef={props.scrollContainerRef}/>
                </div>;
            })}
        </div>;
    } else if (props.item.errorStack) {
        return <div className={classNames(styles['tree-view-item-subtitle__error-stack'], props.className)}>
            {(props.item.errorTitle + '\n' + stripAnsi(props.item.errorStack)).trim()}
        </div>;
    }

    return null;
}
