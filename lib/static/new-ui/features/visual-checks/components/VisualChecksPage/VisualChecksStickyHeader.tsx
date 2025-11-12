import {ArrowRightArrowLeft, ArrowUturnCcwLeft, Check, LayersVertical, ListCheck, SquareDashed, ChevronsExpandToLines} from '@gravity-ui/icons';
import {Button, Divider, Icon, Select, Flex, Tooltip} from '@gravity-ui/uikit';
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
import {DiffModeId, EditScreensFeature, RunTestsFeature, TwoUpFitMode} from '@/constants';
import {getAvailableDiffModes} from '@/static/new-ui/utils/diffModes';
import {
    staticAccepterStageScreenshot,
    staticAccepterUnstageScreenshot,
    toggle2UpDiffVisibility,
    set2UpFitMode
} from '@/static/modules/actions';
import {setVisualChecksDiffMode} from '@/static/modules/actions/visual-checks-page';
import {isAcceptable, isScreenRevertable} from '@/static/modules/utils';
import {AssertViewStatus} from '@/static/new-ui/components/AssertViewStatus';
import {thunkAcceptImages, thunkRevertImages} from '@/static/modules/actions/screenshots';
import {useAnalytics} from '@/static/new-ui/hooks/useAnalytics';

import {preloadImageEntity} from '../../../../../modules/utils/imageEntity';
import {useNavigate} from 'react-router-dom';
import {RunTestButton} from '../../../../components/RunTest';
import {IconButton} from '../../../../components/IconButton';
import {getUrl} from '@/static/new-ui/utils/getUrl';
import {Page} from '@/constants';
import {TreeViewData} from '@/static/new-ui/components/TreeView';
import {TreeViewItemData} from '@/static/new-ui/features/suites/components/SuitesPage/types';
import {getCurrentImageSuiteHash} from '@/static/new-ui/features/visual-checks/components/VisualChecksPage/selectors';

interface VisualChecksStickyHeaderProps {
    currentNamedImage: NamedImageEntity | null;
    treeData: TreeViewData;
    onImageChange: (item: TreeViewItemData) => void;
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

export function VisualChecksStickyHeader({currentNamedImage, treeData, onImageChange}: VisualChecksStickyHeaderProps): ReactNode {
    const visibleNamedImageIds = treeData.allTreeNodeIds;
    const dispatch = useDispatch();
    const analytics = useAnalytics();
    const currentImage = useSelector(getCurrentImage);
    const attempt = useSelector(getAttempt);
    const navigate = useNavigate();
    const hash = useSelector(getCurrentImageSuiteHash);

    const currentNamedImageIndex = visibleNamedImageIds.indexOf(currentNamedImage?.id as string);
    const onPreviousImageHandler = (): void => onImageChange(treeData.tree[currentNamedImageIndex - 1].data);
    const onNextImageHandler = (): void => onImageChange(treeData.tree[currentNamedImageIndex + 1].data);

    usePreloadImages(currentNamedImageIndex, visibleNamedImageIds);

    const diffMode = useSelector(state => state.app.visualChecksPage.diffMode);
    const is2UpDiffVisible = useSelector(state => state.ui.visualChecksPage.is2UpDiffVisible);
    const twoUpFitMode = useSelector(state => state.ui.visualChecksPage.twoUpFitMode);
    const onChangeHandler = (diffModeId: DiffModeId): void => {
        dispatch(setVisualChecksDiffMode(diffModeId));
    };
    const onToggle2UpDiffVisibility = (): void => {
        analytics?.trackFeatureUsage({featureName: 'Toggle 2-up diff visibility'});
        dispatch(toggle2UpDiffVisibility(!is2UpDiffVisible));
    };
    const onToggle2UpFitMode = (): void => {
        const newFitMode = twoUpFitMode === TwoUpFitMode.FitToView ? TwoUpFitMode.FitToWidth : TwoUpFitMode.FitToView;
        analytics?.trackFeatureUsage({featureName: 'Toggle 2-up fit mode'});
        dispatch(set2UpFitMode(newFitMode));
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

    const isRunTestsAvailable = Boolean(useSelector(state => state.app.availableFeatures)
        .find(feature => feature.name === RunTestsFeature.name));

    const onSuites = (): void => {
        if (currentNamedImage) {
            navigate(getUrl({
                page: Page.suitesPage,
                hash: hash,
                browser: currentNamedImage.browserName,
                attempt,
                stateName: currentNamedImage?.stateName
            }));
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
                <Flex gap={2}>
                    <Select className={styles.diffModeSelect} label={<Icon data={ArrowRightArrowLeft}/> as unknown as string} value={[diffMode]} onUpdate={([diffMode]): void => onChangeHandler(diffMode as DiffModeId)} multiple={false}>
                        {getAvailableDiffModes(Page.visualChecksPage).map(diffMode =>
                            <Select.Option value={diffMode.id} content={diffMode.title} title={diffMode.description} key={diffMode.id}/>
                        )}
                    </Select>
                    {diffMode === '2-up-interactive' && (
                        <>
                            <IconButton
                                icon={<Icon data={LayersVertical}/>}
                                view="outlined"
                                onClick={onToggle2UpDiffVisibility}
                                tooltip={is2UpDiffVisible ? 'Diff is visible. Click to hide' : 'Diff is hidden. Click to show'}
                                selected={is2UpDiffVisible}
                            />
                            <IconButton
                                icon={<Icon data={twoUpFitMode === TwoUpFitMode.FitToView ? SquareDashed : ChevronsExpandToLines}/>}
                                view="outlined"
                                onClick={onToggle2UpFitMode}
                                tooltip={twoUpFitMode === TwoUpFitMode.FitToView ? 'Fit to view by default. Click to switch' : 'Fit to width by default. Click to switch'}
                            />
                        </>
                    )}
                </Flex>

                <Flex className={styles.buttonsContainer} gap={2}>
                    <IconButton
                        icon={<Icon data={ListCheck}/>}
                        view="outlined"
                        className={styles.acceptButton}
                        disabled={isRunning || isProcessing}
                        onClick={onSuites}
                        qa="go-suites-button"
                        tooltip="Go to test"
                    />
                    {isRunTestsAvailable && <Tooltip content={'Run test with this visual check'} placement={'top'} openDelay={0} disabled={isRunning} key={isRunning.toString()}>
                        <RunTestButton browser={currentBrowser} buttonProps={{view: 'outlined'}} buttonText={null}/>
                    </Tooltip>}
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
                            {!isUndoAvailable && (
                                <Button
                                    view={'action'}
                                    className={styles.acceptButton}
                                    disabled={isRunning || isProcessing || !currentImage || !isAcceptable(currentImage)}
                                    onClick={onScreenshotAccept}
                                    qa="accept-button"
                                >
                                    <Icon data={Check}/>Accept
                                </Button>
                            )}
                        </>
                    )}
                </Flex>
            </div>
        </div>
    );
}
