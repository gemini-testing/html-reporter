import classNames from 'classnames';
import React, {ReactNode, useState, useRef, useLayoutEffect} from 'react';
import {useSelector} from 'react-redux';
import stripAnsi from 'strip-ansi';
import _ from 'lodash';

import {TreeViewItemData} from '@/static/new-ui/features/suites/components/SuitesPage/types';
import styles from './index.module.css';
import {getAssertViewStatusMessage} from '@/static/new-ui/utils/assert-view-status';
import {makeLinksClickable} from '@/static/new-ui/utils';
import {
    DISABLE_TREE_SCREENSHOTS_MAGNIFIER,
    HIDE_TREE_VIEW_SCREENSHOTS,
    Page,
    TestStatus,
    DiffModeId, DiffModes
} from '@/constants';
import useLocalStorage from '@/static/hooks/useLocalStorage';
import {usePage} from '@/static/new-ui/hooks/usePage';
import {Icon} from '@gravity-ui/uikit';
import {Camera, CircleXmark, CircleCheck} from '@gravity-ui/icons';
import {AssertViewResult} from '@/static/new-ui/components/AssertViewResult';
import {AcceptButton} from '@/static/new-ui/components/AcceptButton';
import {ImageEntity} from '@/static/new-ui/types/store';

interface TreeViewItemSubtitleProps {
    item: TreeViewItemData;
    className?: string;
    // Passed to image with magnifier to detect parent container scrolling and update magnifier position
    scrollContainerRef: React.RefObject<HTMLElement>;
    isSelected: boolean;
}

interface ImageEntityComponentProps {
    imageEntity: ImageEntity;
    scrollContainerRef: React.RefObject<HTMLElement>;
    isVisualChecksPage: boolean;
    diffMode: DiffModeId;
    initialHeight?: number;
    onInitialHeightCapture: (stateName: string, height: number) => void;
}

const getMaxWidth = (imageEntity: ImageEntity, diffMode: DiffModeId): string | number => {
    const padding = 28;

    if (
        diffMode !== DiffModes.THREE_UP_SCALED.id &&
        diffMode !== DiffModes.THREE_UP_SCALED_TO_FIT.id
    ) {
        if (imageEntity.status === TestStatus.FAIL) {
            return imageEntity?.diffImg?.size?.width + padding;
        }

        if (imageEntity.status === TestStatus.ERROR) {
            return imageEntity?.actualImg?.size?.width + padding;
        }

        if (imageEntity.status === TestStatus.SUCCESS) {
            return imageEntity?.expectedImg?.size?.width + padding;
        }
    }

    return 'unset';
};

const ImageEntityComponent = ({imageEntity, isVisualChecksPage, scrollContainerRef, diffMode, initialHeight, onInitialHeightCapture}: ImageEntityComponentProps): ReactNode => {
    const [isHideScreenshots] = useLocalStorage(HIDE_TREE_VIEW_SCREENSHOTS, false);
    const [isTreeMagnifierDisabled] = useLocalStorage(DISABLE_TREE_SCREENSHOTS_MAGNIFIER, false);
    const [isFocused, setFocused] = useState(false);
    const imageDiffRef = useRef<HTMLDivElement>(null);
    const maxWidth = getMaxWidth(imageEntity, diffMode);

    useLayoutEffect(() => {
        if (imageEntity.status === TestStatus.FAIL && imageDiffRef.current) {
            const img = imageDiffRef.current.querySelector('img');
            onInitialHeightCapture(imageEntity.stateName, img?.offsetHeight ? img?.offsetHeight : imageDiffRef.current.offsetHeight);
        }
    }, [imageEntity.status]);

    const imageDiffStyle = initialHeight && imageEntity.status !== TestStatus.FAIL
        ? {'--img-max-height': `${initialHeight}px`} as React.CSSProperties
        : undefined;

    return (
        <div
            key={imageEntity.id}
            className={classNames(styles.imageContainer, !isVisualChecksPage ? styles.suites : null)}
            onMouseEnter={(): void => setFocused(true)}
            onMouseLeave={(): void => setFocused(false)}
            style={{maxWidth}}
        >
            <span className={styles.imageStatus}>
                {!isVisualChecksPage && <Icon data={Camera} width={16} height={16}/>} {imageEntity.stateName} ⋅ {getAssertViewStatusMessage(imageEntity)}
            </span>
            {(!isHideScreenshots || isVisualChecksPage) && (
                <div className={styles.imageDiff} ref={imageDiffRef} style={imageDiffStyle}>
                    <AssertViewResult
                        labelClassName={styles.imageLabel}
                        result={imageEntity}
                        diffMode={diffMode}
                        magnifier={!isTreeMagnifierDisabled ? scrollContainerRef : undefined}
                    />
                </div>
            )}
            <div className={styles.acceptButtonContainer}>
                <AcceptButton
                    isFocused={isFocused}
                    className={styles.acceptButton}
                    imageId={imageEntity.id}
                    isLastResult={true}
                    view="outlined"
                />
            </div>
        </div>
    );
};

export function TreeViewItemSubtitle(props: TreeViewItemSubtitleProps): ReactNode {
    const page = usePage();
    const diffMode = useSelector(state => page === Page.suitesPage ? state.view.diffMode : state.app.visualChecksPage.diffMode);
    const isVisualChecksPage = page === Page.visualChecksPage;
    const initialHeightsRef = useRef<Map<string, number>>(new Map());

    const handleInitialHeightCapture = (stateName: string, height: number): void => {
        initialHeightsRef.current.set(stateName, height);
    };

    const lastResult = useSelector(({tree}) => {
        if (!tree || !tree.browsers || !tree.browsers.byId[props.item.entityId]) {
            return null;
        }

        const lastAttempt = _.last(tree.browsers.byId[props.item.entityId].resultIds);

        if (!lastAttempt) {
            return null;
        }

        return tree.results.byId[lastAttempt];
    });

    const lastImageList = useSelector(({tree}) => (
        lastResult?.imageIds
            .map((imageId) => tree.images.byId[imageId])
            .filter((image) => image.stateName)
    ));

    const duration = ((lastResult?.duration || 0) / 1000).toFixed(2);

    if (props.item.status === TestStatus.SKIPPED && props.item.skipReason) {
        return (
            <div className={styles.skipReasonContainer}>
                <div className={styles.skipReason}>Skipped ⋅ {makeLinksClickable(props.item.skipReason)}</div>
            </div>
        );
    }

    const imageList = lastImageList || props.item.images;

    if (imageList?.length) {
        return (
            <div className={classNames(styles.imagesContainer, props.isSelected && styles.selected)}>
                {imageList.map((imageEntity) => (
                    <ImageEntityComponent
                        diffMode={diffMode}
                        key={imageEntity.stateName}
                        imageEntity={imageEntity}
                        scrollContainerRef={props.scrollContainerRef}
                        isVisualChecksPage={isVisualChecksPage}
                        initialHeight={initialHeightsRef.current.get(imageEntity.stateName || '')}
                        onInitialHeightCapture={handleInitialHeightCapture}
                    />
                ))}
                {!isVisualChecksPage && (
                    <span className={styles.imageStatusEnd}>
                        {props.item.status === TestStatus.SUCCESS ? (
                            <><Icon data={CircleCheck} width={16} height={16}/> Success in {duration}s <span className={styles.line}/></>
                        ) : (
                            <><Icon data={CircleXmark} width={16} height={16}/> Failure in {duration}s <span className={styles.line}/></>
                        )}
                    </span>
                )}
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
