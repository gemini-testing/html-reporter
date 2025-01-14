import {ArrowUturnCcwLeft, Check} from '@gravity-ui/icons';
import {Button, Divider, Icon, Select} from '@gravity-ui/uikit';
import classNames from 'classnames';
import React, {ReactNode, useEffect, useRef} from 'react';
import {useDispatch, useSelector} from 'react-redux';

import {SplitViewLayout} from '@/static/new-ui/components/SplitViewLayout';
import {UiCard} from '@/static/new-ui/components/Card/UiCard';
import {
    getCurrentImage,
    getCurrentNamedImage,
    getImagesByNamedImageIds,
    getVisibleNamedImageIds
} from '@/static/new-ui/features/visual-checks/selectors';
import {SuiteTitle} from '@/static/new-ui/components/SuiteTitle';
import {AssertViewResult} from '@/static/new-ui/components/AssertViewResult';
import styles from './index.module.css';
import {CompactAttemptPicker} from '@/static/new-ui/components/CompactAttemptPicker';
import {DiffModeId, DiffModes, EditScreensFeature} from '@/constants';
import {
    setDiffMode,
    staticAccepterStageScreenshot, staticAccepterUnstageScreenshot,
    visualChecksPageSetCurrentNamedImage
} from '@/static/modules/actions';
import {isAcceptable, isScreenRevertable} from '@/static/modules/utils';
import {AssertViewStatus} from '@/static/new-ui/components/AssertViewStatus';
import {
    AssertViewResultSkeleton
} from '@/static/new-ui/features/visual-checks/components/VisualChecksPage/AssertViewResultSkeleton';
import {thunkAcceptImages, thunkRevertImages} from '@/static/modules/actions/screenshots';
import {useAnalytics} from '@/static/new-ui/hooks/useAnalytics';
import {preloadImageEntity} from '../../../../../modules/utils/imageEntity';

export const PRELOAD_IMAGES_COUNT = 3;

const usePreloadImages = (
    currentNamedImageIndex: number,
    visibleNamedImageIds: string[]): void => {
    const preloaded = useRef<Record<string, () => void | undefined>>({});

    const namedImageIdsToPreload: string[] = visibleNamedImageIds.slice(
        Math.max(0, currentNamedImageIndex - 1 - PRELOAD_IMAGES_COUNT),
        Math.min(visibleNamedImageIds.length, currentNamedImageIndex + 1 + PRELOAD_IMAGES_COUNT)
    );

    const imagesToPreload = useSelector((state) => getImagesByNamedImageIds(state, namedImageIdsToPreload));

    useEffect(() => {
        imagesToPreload.forEach(image => {
            if (preloaded.current[image.id]) {
                return;
            }

            preloaded.current[image.id] = preloadImageEntity(image);
        });
    }, [currentNamedImageIndex]);

    useEffect(() => () => {
        Object.values(preloaded.current).forEach(preload => preload?.());
    }, []);
};

export function VisualChecksPage(): ReactNode {
    const dispatch = useDispatch();
    const analytics = useAnalytics();

    const currentNamedImage = useSelector(getCurrentNamedImage);
    const currentImage = useSelector(getCurrentImage);
    const visibleNamedImageIds = useSelector(getVisibleNamedImageIds);

    const currentNamedImageIndex = visibleNamedImageIds.indexOf(currentNamedImage?.id as string);
    const onPreviousImageHandler = (): void => void dispatch(visualChecksPageSetCurrentNamedImage(visibleNamedImageIds[currentNamedImageIndex - 1]));
    const onNextImageHandler = (): void => void dispatch(visualChecksPageSetCurrentNamedImage(visibleNamedImageIds[currentNamedImageIndex + 1]));

    usePreloadImages(currentNamedImageIndex, visibleNamedImageIds);

    const diffMode = useSelector(state => state.view.diffMode);
    const onChangeHandler = (diffModeId: DiffModeId): void => {
        dispatch(setDiffMode({diffModeId}));
    };

    const isStaticImageAccepterEnabled = useSelector(state => state.staticImageAccepter.enabled);
    const isEditScreensAvailable = useSelector(state => state.app.availableFeatures)
        .find(feature => feature.name === EditScreensFeature.name);
    const isRunning = useSelector(state => state.running);
    const isProcessing = useSelector(state => state.processing);
    const isGui = useSelector(state => state.gui);

    const onScreenshotAccept = (): void => {
        if (!currentImage) {
            return;
        }
        analytics?.trackScreenshotsAccept();

        if (isStaticImageAccepterEnabled) {
            dispatch(staticAccepterStageScreenshot([currentImage.id]));
        } else {
            dispatch(thunkAcceptImages({imageIds: [currentImage.id]}));
        }
    };
    const onScreenshotUndo = (): void => {
        if (!currentImage) {
            return;
        }

        if (isStaticImageAccepterEnabled) {
            dispatch(staticAccepterUnstageScreenshot([currentImage.id]));
        } else {
            dispatch(thunkRevertImages({imageIds: [currentImage.id]}));
        }
    };

    const currentBrowserId = useSelector(state => state.tree.results.byId[currentImage?.parentId ?? '']?.parentId);
    const currentBrowser = useSelector(state => currentBrowserId && state.tree.browsers.byId[currentBrowserId]);

    const currentResultId = currentImage?.parentId;
    const isLastResult = Boolean(currentResultId && currentBrowser && currentResultId === currentBrowser.resultIds[currentBrowser.resultIds.length - 1]);
    const isUndoAvailable = isScreenRevertable({gui: isGui, image: currentImage ?? {}, isLastResult, isStaticImageAccepterEnabled});

    const isInitialized = useSelector(state => state.app.isInitialized);

    return <div className={styles.container}><SplitViewLayout sections={[
        <UiCard key="test-view" className={classNames(styles.card, styles.testViewCard)}>
            {isInitialized && <><div className={styles.stickyHeader}>
                {currentNamedImage && <SuiteTitle
                    className={styles['card__title']}
                    suitePath={currentNamedImage.suitePath}
                    browserName={currentNamedImage.browserName}
                    index={currentNamedImageIndex}
                    totalItems={visibleNamedImageIds.length}
                    onPrevious={onPreviousImageHandler}
                    stateName={currentNamedImage.stateName}
                    onNext={onNextImageHandler}/>}
                <div className={styles.toolbarContainer}>
                    <CompactAttemptPicker/>
                    <Divider orientation={'vertical'}/>
                    <AssertViewStatus image={currentImage}/>
                    <Divider orientation={'vertical'}/>
                    <Select className={styles.diffModeSelect} label='Diff Mode' value={[diffMode]} onUpdate={([diffMode]): void => onChangeHandler(diffMode as DiffModeId)} multiple={false}>
                        {Object.values(DiffModes).map(diffMode =>
                            <Select.Option value={diffMode.id} content={diffMode.title} title={diffMode.description} key={diffMode.id}/>
                        )}
                    </Select>
                    {isEditScreensAvailable && <div className={styles.buttonsContainer}>
                        {isUndoAvailable && <Button view={'action'} className={styles.acceptButton} disabled={isRunning || isProcessing} onClick={onScreenshotUndo}><Icon
                            data={ArrowUturnCcwLeft}/>Undo</Button>}
                        {currentImage && isAcceptable(currentImage) && <Button view={'action'} className={styles.acceptButton} disabled={isRunning || isProcessing} onClick={onScreenshotAccept}><Icon
                            data={Check}/>Accept</Button>}
                    </div>}
                </div>
            </div>
            {currentImage && <AssertViewResult result={currentImage}/>}
            {!currentImage && <div className={styles.hint}>This run doesn&apos;t have an image with
                name &quot;{currentNamedImage?.stateName}&quot;</div>}
            </>}
            {!isInitialized && <AssertViewResultSkeleton />}
        </UiCard>
    ]}/></div>;
}
