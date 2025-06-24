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
        return (
            <div className={styles.skipReasonContainer}>
                <div className={styles.skipReason}>Skipped ⋅ {makeLinksClickable(props.item.skipReason)}</div>
            </div>
        );
    } else if (props.item.images?.length) {
        return (
            <div>
                {props.item.images.map((imageEntity) => {
                    const imageItem: ImageEntityFail = imageEntity as ImageEntityFail;

                    if (!imageItem.diffImg) {
                        return;
                    }

                    const images = [
                        {
                            title: 'Expected',
                            image: imageItem.expectedImg
                        },
                        {
                            title: 'Actual',
                            image: imageItem.actualImg
                        },
                        {
                            title: 'Diff',
                            image: imageItem.diffImg
                        }
                    ];

                    return (
                        <div key={imageItem.id}>
                            <span className={styles.imageStatus}>{imageItem.stateName} ⋅ {getAssertViewStatusMessage(imageEntity)}</span>
                            <div className={styles.imageDiff}>
                                {images.map((item) => (
                                    <div className={styles.imageDiffItem} key={item.title}>
                                        <p>{item.title}</p>
                                        <ImageWithMagnifier
                                            image={item.image}
                                            scrollContainerRef={props.scrollContainerRef}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    } else if (props.item.errorStack) {
        return (
            <div className={classNames(styles['tree-view-item-subtitle__error-stack'], props.className)}>
                {(props.item.errorTitle + '\n' + stripAnsi(props.item.errorStack)).trim()}
            </div>
        );
    }

    return null;
}
