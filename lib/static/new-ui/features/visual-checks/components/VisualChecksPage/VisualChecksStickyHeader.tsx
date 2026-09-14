import {LayersVertical, ListCheck, SquareDashed, ChevronsExpandToLines} from '@gravity-ui/icons';
import {Button, Divider, Hotkey, Icon, Flex, Tooltip} from '@gravity-ui/uikit';
import React, {ReactNode, useCallback, useEffect, useRef} from 'react';
import {useDispatch, useSelector} from 'react-redux';

import {
    getAttempt,
    getCurrentBrowser,
    getCurrentImage,
    getImagesByNamedImageIds,
    getNamedImages,
    NamedImageEntity
} from '@/static/new-ui/features/visual-checks/selectors';
import {SuiteTitle} from '@/static/new-ui/components/SuiteTitle';
import styles from './index.module.css';
import {CompactAttemptPicker} from '@/static/new-ui/components/CompactAttemptPicker';
import {RunTestsFeature, TwoUpFitMode} from '@/constants';
import {DiffModeSelector} from '@/static/new-ui/components/DiffModeSelector';
import {
    toggle2UpDiffVisibility,
    set2UpFitMode,
    thunkRunTest
} from '@/static/modules/actions';
import {isAcceptable} from '@/static/modules/utils';
import {AssertViewStatus} from '@/static/new-ui/components/AssertViewStatus';
import {useAnalytics} from '@/static/new-ui/hooks/useAnalytics';
import {useHotkey} from '@/static/new-ui/hooks/useHotkey';

import {preloadImageEntity} from '../../../../../modules/utils/imageEntity';
import {useNavigate} from 'react-router-dom';
import {RunTestButton} from '../../../../components/RunTest';
import {IconButton} from '../../../../components/IconButton';
import {getUrl} from '@/static/new-ui/utils/getUrl';
import {Page} from '@/constants';
import {TreeViewData} from '@/static/new-ui/components/TreeView';
import {TreeViewItemData} from '@/static/new-ui/features/suites/components/SuitesPage/types';
import {getCurrentImageSuiteHash} from '@/static/new-ui/features/visual-checks/components/VisualChecksPage/selectors';
import {useIsRunning} from '@/static/new-ui/hooks/useIsRunning';
import {AcceptButton} from '@/static/new-ui/components/AcceptButton';

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
    const namedImages = useSelector(getNamedImages);
    const allImages = useSelector(state => state.tree.images.byId);
    const allResults = useSelector(state => state.tree.results.byId);
    const browsersStateById = useSelector(state => state.tree.browsers.stateById);

    const currentNamedImageIndex = visibleNamedImageIds.indexOf(currentNamedImage?.id as string);
    const onPreviousImageHandler = (): void => onImageChange(treeData.tree[currentNamedImageIndex - 1].data);
    const onNextImageHandler = (): void => onImageChange(treeData.tree[currentNamedImageIndex + 1].data);

    usePreloadImages(currentNamedImageIndex, visibleNamedImageIds);

    const findNextAcceptableImage = useCallback((startIndex: number): TreeViewItemData | null => {
        for (let i = startIndex; i < treeData.tree.length; i++) {
            const treeItem = treeData.tree[i];
            const namedImageId = treeItem.data.id;
            const namedImage = namedImages[namedImageId];

            if (!namedImage) {
                continue;
            }

            const retryIndex = browsersStateById[namedImage.browserId]?.retryIndex ?? 0;
            const imageId = namedImage.imageIds.find(imgId => {
                const resultId = allImages[imgId]?.parentId;
                return resultId && allResults[resultId]?.attempt === retryIndex;
            });

            if (!imageId) {
                continue;
            }

            const image = allImages[imageId];
            if (image && isAcceptable(image)) {
                return treeItem.data;
            }
        }
        return null;
    }, [treeData.tree, namedImages, browsersStateById, allImages, allResults]);

    const diffMode = useSelector(state => state.app.visualChecksPage.diffMode);
    const is2UpDiffVisible = useSelector(state => state.ui.visualChecksPage.is2UpDiffVisible);
    const twoUpFitMode = useSelector(state => state.ui.visualChecksPage.twoUpFitMode);
    const onToggle2UpDiffVisibility = (): void => {
        analytics?.trackFeatureUsage({featureName: 'Toggle 2-up diff visibility'});
        dispatch(toggle2UpDiffVisibility(!is2UpDiffVisible));
    };
    const onToggle2UpFitMode = (): void => {
        const newFitMode = twoUpFitMode === TwoUpFitMode.FitToView ? TwoUpFitMode.FitToWidth : TwoUpFitMode.FitToView;
        analytics?.trackFeatureUsage({featureName: 'Toggle 2-up fit mode'});
        dispatch(set2UpFitMode(newFitMode));
    };

    const isRunning = useIsRunning();
    const isProcessing = useSelector(state => state.processing);

    const currentBrowser = useSelector(getCurrentBrowser);
    const currentResultId = currentImage?.parentId;
    const isLastResult = Boolean(currentResultId && currentBrowser && currentResultId === currentBrowser.resultIds[currentBrowser.resultIds.length - 1]);

    const isRunTestsAvailable = Boolean(useSelector(state => state.app.availableFeatures)
        .find(feature => feature.name === RunTestsFeature.name));

    const onRunTest = useCallback((): void => {
        if (currentBrowser && !isRunning) {
            analytics?.trackFeatureUsage({featureName: 'Run test via hotkey R'});
            dispatch(thunkRunTest({test: {testName: currentBrowser.parentId, browserName: currentBrowser.name}}));
        }
    }, [currentBrowser, isRunning, analytics, dispatch]);

    const onSuites = useCallback((): void => {
        if (currentNamedImage) {
            navigate(getUrl({
                page: Page.suitesPage,
                hash,
                browser: currentNamedImage.browserName,
                attempt,
                stateName: currentNamedImage?.stateName
            }));
        }
    }, [currentNamedImage, navigate, hash, attempt]);

    const onAccept = useCallback((): void => {
        const nextAcceptable = findNextAcceptableImage(currentNamedImageIndex + 1);

        if (nextAcceptable) {
            onImageChange(nextAcceptable);
        }
    }, [currentNamedImageIndex, onImageChange]);

    useHotkey('r', onRunTest, {enabled: isRunTestsAvailable && !isRunning});
    useHotkey('g', onSuites, {enabled: Boolean(currentNamedImage) && !isRunning && !isProcessing});

    return (
        <div className={styles.stickyHeader}>
            {currentNamedImage && (
                <SuiteTitle
                    className={styles['card__title']}
                    suitePath={currentNamedImage.suitePath}
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
                    <DiffModeSelector className={styles.diffModeSelect} qa="diff-mode-select" />
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
                    <Tooltip
                        content={<>Go to test ⋅ <Hotkey value="g" view="light" /></>}
                        placement={'top'} openDelay={0} disabled={isRunning} key={isRunning.toString()}
                    >
                        <Button
                            view="outlined"
                            className={styles.goToTest}
                            disabled={isRunning || isProcessing}
                            onClick={onSuites}
                            qa="go-suites-button"
                        >
                            <Icon data={ListCheck}/>Go to Test<Hotkey className={styles.hotkey} view="light" value="g" />
                        </Button>
                    </Tooltip>
                    {isRunTestsAvailable && (
                        <Tooltip
                            content={<>Run test with this visual check ⋅ <Hotkey value="r" view="light" /></>} placement={'top'} openDelay={0} disabled={isRunning} key={isRunning.toString()}
                        >
                            <RunTestButton
                                className={styles.actionButton}
                                browser={currentBrowser}
                                buttonProps={{view: 'outlined'}}
                                hotkey={<Hotkey className={styles.hotkey} view="light" value="r" />}
                            />
                        </Tooltip>
                    )}
                    {currentImage && (
                        <AcceptButton
                            className={styles.actionButton}
                            imageId={currentImage.id}
                            isFocused
                            onAccept={onAccept}
                            isLastResult={isLastResult}
                        />
                    )}
                </Flex>
            </div>
        </div>
    );
}
