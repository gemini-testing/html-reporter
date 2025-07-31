import classNames from 'classnames';
import React, {ReactNode} from 'react';
import stripAnsi from 'strip-ansi';

import {TreeViewItemData} from '@/static/new-ui/features/suites/components/SuitesPage/types';
import {ImageWithMagnifier} from '@/static/new-ui/components/ImageWithMagnifier';
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
    }

    if (props.item.images?.length) {
        return (
            <div>
                {props.item.images.map((imageEntity) => {
                    const images = [];

                    if (
                        imageEntity.status === TestStatus.FAIL ||
                        imageEntity.status === TestStatus.UPDATED ||
                        imageEntity.status === TestStatus.SUCCESS
                    ) {
                        images.push({
                            title: 'Expected',
                            image: imageEntity.expectedImg
                        });
                    }

                    if (
                        imageEntity.status !== TestStatus.UPDATED &&
                        imageEntity.status !== TestStatus.SUCCESS
                    ) {
                        images.push({
                            title: 'Actual',
                            image: imageEntity.actualImg
                        });
                    }

                    if (imageEntity.status === TestStatus.FAIL) {
                        images.push({
                            title: 'Diff',
                            image: imageEntity.diffImg
                        });
                    }

                    return (
                        <div key={imageEntity.id}>
                            <span className={styles.imageStatus}>{imageEntity.stateName} ⋅ {getAssertViewStatusMessage(imageEntity)}</span>
                            <div className={styles.imageDiff}>
                                {images.filter(({image}) => Boolean(image)).map((item) => (
                                    <div
                                        className={
                                            classNames(styles.imageDiffItem, images.length === 3 && item.title !== 'Diff' && styles.canHide)
                                        }
                                        key={item.title}
                                    >
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
    }

    if (props.item.errorStack) {
        return (
            <div className={classNames(styles['tree-view-item-subtitle__error-stack'], props.className)}>
                {(props.item.errorTitle + '\n' + stripAnsi(props.item.errorStack)).trim()}
            </div>
        );
    }

    return null;
}
