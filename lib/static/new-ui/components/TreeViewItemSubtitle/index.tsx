import classNames from 'classnames';
import React, {ReactNode} from 'react';
import stripAnsi from 'strip-ansi';

import {TreeViewItemData} from '@/static/new-ui/features/suites/components/SuitesPage/types';
import {ImageWithMagnifier} from '@/static/new-ui/components/ImageWithMagnifier';
import styles from './index.module.css';
import {getAssertViewStatusMessage} from '@/static/new-ui/utils/assert-view-status';
import {getImageDisplayedSize, makeLinksClickable} from '@/static/new-ui/utils';
import {DISABLE_TREE_SCREENSHOTS_MAGNIFIER, HIDE_TREE_VIEW_SCREENSHOTS, Page, TestStatus} from '@/constants';
import useLocalStorage from '@/static/hooks/useLocalStorage';
import {usePage} from '@/static/new-ui/hooks/usePage';
import {Screenshot} from '@/static/new-ui/components/Screenshot';
import {ImageLabel} from '@/static/new-ui/components/ImageLabel';
import {
    getDisplayedDiffPercentValue,
    getDisplayedDiffPixelsCountValue
} from '@/static/new-ui/components/DiffViewer/utils';

interface TreeViewItemSubtitleProps {
    item: TreeViewItemData;
    className?: string;
    // Passed to image with magnifier to detect parent container scrolling and update magnifier position
    scrollContainerRef: React.RefObject<HTMLElement>;
}

export function TreeViewItemSubtitle(props: TreeViewItemSubtitleProps): ReactNode {
    const page = usePage();
    const isVisualChecksPage = page === Page.visualChecksPage;

    if (props.item.status === TestStatus.SKIPPED && props.item.skipReason) {
        return (
            <div className={styles.skipReasonContainer}>
                <div className={styles.skipReason}>Skipped ⋅ {makeLinksClickable(props.item.skipReason)}</div>
            </div>
        );
    }

    const [isHideScreenshots] = useLocalStorage(HIDE_TREE_VIEW_SCREENSHOTS, false);
    const [isTreeMagnifierDisabled] = useLocalStorage(DISABLE_TREE_SCREENSHOTS_MAGNIFIER, false);

    if (props.item.images?.length) {
        return (
            <div style={{overflow: 'hidden'}}>
                {props.item.images.map((imageEntity) => {
                    const images = [];

                    if (
                        imageEntity.status === TestStatus.FAIL ||
                        imageEntity.status === TestStatus.UPDATED ||
                        imageEntity.status === TestStatus.SUCCESS
                    ) {
                        images.push({
                            title: 'Expected',
                            subTitle: getImageDisplayedSize(imageEntity.expectedImg),
                            image: imageEntity.expectedImg
                        });
                    }

                    if (
                        imageEntity.status !== TestStatus.UPDATED &&
                        imageEntity.status !== TestStatus.SUCCESS
                    ) {
                        images.push({
                            title: 'Actual',
                            subTitle: getImageDisplayedSize(imageEntity.actualImg),
                            image: imageEntity.actualImg
                        });
                    }

                    if (imageEntity.status === TestStatus.FAIL) {
                        let subTitle = '';
                        if (imageEntity.differentPixels && imageEntity.diffRatio) {
                            subTitle = `${getDisplayedDiffPixelsCountValue(imageEntity.differentPixels)} ⋅ ${getDisplayedDiffPercentValue(imageEntity.diffRatio)}%`;
                        }
                        images.push({
                            title: 'Diff',
                            subTitle,
                            image: imageEntity.diffImg,
                            diffClusters: imageEntity.diffClusters
                        });
                    }

                    return (
                        <div key={imageEntity.id}>
                            <span className={styles.imageStatus}>{imageEntity.stateName} ⋅ {getAssertViewStatusMessage(imageEntity)}</span>
                            {(!isHideScreenshots || isVisualChecksPage) && (
                                <div className={styles.imageDiff}>
                                    {images.filter(({image}) => Boolean(image)).map((item) => (
                                        <div
                                            className={
                                                classNames(styles.imageDiffItem, images.length === 3 && item.title !== 'Diff' && styles.canHide)
                                            }
                                            key={item.title}
                                        >
                                            <ImageLabel
                                                className={styles.imageLabel}
                                                title={item.title}
                                                subtitle={item.subTitle}
                                            />
                                            {isTreeMagnifierDisabled ? (
                                                <div style={{display: 'flex'}}>
                                                    <Screenshot
                                                        image={item.image}
                                                        diffClusters={item?.diffClusters}
                                                    />
                                                </div>
                                            ) : (
                                                <ImageWithMagnifier
                                                    image={item.image}
                                                    scrollContainerRef={props.scrollContainerRef}
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    }

    if (props.item.errorStack) {
        return (
            <div data-qa="error-stack-item" className={classNames(styles['tree-view-item-subtitle__error-stack'], props.className)}>
                {(props.item.errorTitle + '\n' + stripAnsi(props.item.errorStack)).trim()}
            </div>
        );
    }

    return null;
}
