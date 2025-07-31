import {ArrowUturnCcwLeft, Check, ListCheck} from '@gravity-ui/icons';
import {Button, Divider, Icon, Select, Flex} from '@gravity-ui/uikit';
import React, {ReactNode, useEffect, useRef} from 'react';
import {useDispatch, useSelector} from 'react-redux';

import {
    getAttempt,
    getCurrentBrowser,
    getCurrentImage,
    getImagesByNamedImageIds,
    NamedImageEntity
} from '@/static/new-ui/features/visual-checks/selectors';
import {SuiteTitle} from '@/static/new-ui/components/SuiteTitle';
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
import {thunkAcceptImages, thunkRevertImages} from '@/static/modules/actions/screenshots';
import {useAnalytics} from '@/static/new-ui/hooks/useAnalytics';

import {preloadImageEntity} from '../../../../../modules/utils/imageEntity';
import {useNavigate} from 'react-router-dom';
import {RunTest} from '../../../../components/RunTest';

interface VisualChecksStickyHeaderProps {
    currentNamedImage: NamedImageEntity | null;
    visibleNamedImageIds: string[];
    onImageChange: (id: string) => void;
}

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
            preloaded.current[image.id] = preloadImageEntity(image);
        });
    }, [currentNamedImageIndex]);

    useEffect(() => () => {
        Object.values(preloaded.current).forEach(disposeCallback => disposeCallback?.());
    }, []);
};

export function VisualChecksStickyHeader({currentNamedImage, visibleNamedImageIds}: VisualChecksStickyHeaderProps): ReactNode {
    const dispatch = useDispatch();
    const analytics = useAnalytics();
    const currentImage = useSelector(getCurrentImage);
    const attempt = useSelector(getAttempt);
    const navigate = useNavigate();

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

    const currentBrowser = useSelector(getCurrentBrowser);

    const currentResultId = currentImage?.parentId;
    const isLastResult = Boolean(currentResultId && currentBrowser && currentResultId === currentBrowser.resultIds[currentBrowser.resultIds.length - 1]);
    const isUndoAvailable = isScreenRevertable({gui: isGui, image: currentImage ?? {}, isLastResult, isStaticImageAccepterEnabled});

    const onSuites = (): void => {
        if (currentNamedImage) {
            navigate('/' + [
                'suites',
                currentNamedImage?.browserId as string,
                currentNamedImage?.stateName as string,
                attempt?.toString() as string
            ].map(encodeURIComponent).join('/'));
        }
    };

    return (
        <div className={styles.stickyHeader}>
            {currentNamedImage && (
                <SuiteTitle
                    className={styles['card__title']}
                    suitePath={currentNamedImage.suitePath}
                    browserName={currentNamedImage.browserName}
                    index={currentNamedImageIndex}
                    totalItems={visibleNamedImageIds.length}
                    onPrevious={onPreviousImageHandler}
                    stateName={currentNamedImage.stateName}
                    onNext={onNextImageHandler}
                />
            )}

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

                <Flex className={styles.buttonsContainer} gap={2}>
                    <Button
                        view="outlined"
                        className={styles.acceptButton}
                        disabled={isRunning || isProcessing}
                        onClick={onSuites}
                        qa="go-suites-button"
                    >
                        <Icon data={ListCheck}/>Go to Suites
                    </Button>
                    {isEditScreensAvailable && (
                        <>
                            {isUndoAvailable && (
                                <Button
                                    view="action"
                                    className={styles.acceptButton}
                                    disabled={isRunning || isProcessing}
                                    onClick={onScreenshotUndo}
                                    qa="undo-button"
                                >
                                    <Icon data={ArrowUturnCcwLeft}/>Undo
                                </Button>
                            )}
                            {currentImage && isAcceptable(currentImage) && (
                                <Button
                                    view={'action'}
                                    className={styles.acceptButton}
                                    disabled={isRunning || isProcessing}
                                    onClick={onScreenshotAccept}
                                    qa="accept-button"
                                >
                                    <Icon data={Check}/>Accept
                                </Button>
                            )}
                            <RunTest showPlayer={false} browser={currentBrowser} />
                        </>
                    )}
                </Flex>
            </div>
        </div>
    );
}
