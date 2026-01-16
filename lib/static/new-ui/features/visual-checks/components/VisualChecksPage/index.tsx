import classNames from 'classnames';
import React, {ReactNode, useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';

import {SplitViewLayout} from '@/static/new-ui/components/SplitViewLayout';
import {UiCard} from '@/static/new-ui/components/Card/UiCard';
import {
    getAttempt,
    getLastAttempt,
    getCurrentNamedImage,
    getCurrentBrowser, getCurrentImage
} from '@/static/new-ui/features/visual-checks/selectors';
import {AssertViewResult} from '@/static/new-ui/components/AssertViewResult';
import styles from './index.module.css';
import {
    AssertViewResultSkeleton
} from '@/static/new-ui/features/visual-checks/components/VisualChecksPage/AssertViewResultSkeleton';
import {VisualChecksStickyHeader} from './VisualChecksStickyHeader';
import {ErrorHandler} from '../../../error-handling/components/ErrorHandling';
import * as actions from '@/static/modules/actions';
import {changeTestRetry, visualChecksPageSetCurrentNamedImage} from '@/static/modules/actions';
import {SideBar, SideBarHandle} from '@/static/new-ui/components/SideBar';
import {getCurrentImageSuiteHash, getVisualChecksViewMode, getVisualTreeViewData} from './selectors';
import {TreeViewHandle} from '@/static/new-ui/components/TreeView';
import {TreeViewItemData} from '@/static/new-ui/features/suites/components/SuitesPage/types';
import {Page, TestStatus, ViewMode} from '@/constants';
import {getIconByStatus} from '@/static/new-ui/utils';
import {isSectionHidden} from '@/static/new-ui/features/suites/utils';
import {MIN_SECTION_SIZE_PERCENT} from '@/static/new-ui/features/suites/constants';
import {usePage} from '@/static/new-ui/hooks/usePage';
import {useHotkey} from '@/static/new-ui/hooks/useHotkey';
import {useNavigate, useParams} from 'react-router-dom';
import {RunTestLoading} from '@/static/new-ui/components/RunTestLoading';
import {getUrl} from '@/static/new-ui/utils/getUrl';
import {getCurrentBrowserId} from '@/static/new-ui/features/suites/selectors';

export function VisualChecksPage(): ReactNode {
    const dispatch = useDispatch();
    const page = usePage();

    const currentNamedImage = useSelector(getCurrentNamedImage);
    const attempt = useSelector(getAttempt);
    const lastAttempt = useSelector(getLastAttempt);
    const currentImage = useSelector(getCurrentImage);
    const currentBrowser = useSelector(getCurrentBrowser);
    const diffMode = useSelector(state => state.app.visualChecksPage.diffMode);
    const [imageChanged, setImageChanged] = useState<boolean>(false);

    const navigate = useNavigate();
    const params = useParams();
    const inited = useRef(false);
    const isRunning = currentNamedImage?.status === TestStatus.RUNNING;
    const urlBrowserId = useSelector(getCurrentBrowserId(params));
    const currentImageSuiteId = useSelector((state) => (
        state.app.visualChecksPage.currentBrowserId
    ));
    const hash = useSelector(getCurrentImageSuiteHash);

    const currentImageStateName = useSelector((state) => (
        state.app.visualChecksPage.stateName
    ));

    const currentTreeNodeId = `${currentImageSuiteId} ${currentImageStateName}`;

    const treeData = useSelector(getVisualTreeViewData);
    const suitesTreeViewRef = useRef<TreeViewHandle>(null);
    const sideBarRef = useRef<SideBarHandle>(null);

    useEffect(() => {
        suitesTreeViewRef?.current?.scrollToId(currentTreeNodeId as string);
    }, [suitesTreeViewRef, currentTreeNodeId]);

    const isInitialized = useSelector(state => state.app.isInitialized);

    const onImageChange = useCallback((item: TreeViewItemData) => {
        dispatch(visualChecksPageSetCurrentNamedImage({
            currentBrowserId: item.browserId,
            stateName: item.stateName
        }));
        setImageChanged(true);
    }, [treeData]);

    const visibleNamedImageIds = treeData.allTreeNodeIds;
    const currentNamedImageIndex = visibleNamedImageIds.indexOf(currentTreeNodeId);

    const onPrevNextImageHandler = useCallback((step: number): void => {
        const nextIndex = currentNamedImageIndex + step;
        if (nextIndex < 0 || nextIndex >= visibleNamedImageIds.length) {
            return;
        }

        const nextItem = treeData.tree[nextIndex]?.data;
        if (nextItem) {
            onImageChange(nextItem);
        }
    }, [currentNamedImageIndex, visibleNamedImageIds, treeData.tree, onImageChange]);

    const totalAttempts = currentBrowser?.resultIds.length ?? 0;

    const onPrevNextAttemptHandler = useCallback((step: number): void => {
        if (!currentBrowser || attempt === null) {
            return;
        }

        const newAttempt = attempt + step;
        if (newAttempt < 0 || newAttempt >= totalAttempts) {
            return;
        }

        dispatch(changeTestRetry({browserId: currentBrowser.id, retryIndex: newAttempt}));
    }, [currentBrowser, attempt, totalAttempts, dispatch]);

    const goToNextImage = useCallback(() => onPrevNextImageHandler(1), [onPrevNextImageHandler]);
    const goToPrevImage = useCallback(() => {
        if (currentNamedImageIndex === 0) {
            sideBarRef.current?.focusSearch();
            return;
        }
        onPrevNextImageHandler(-1);
    }, [onPrevNextImageHandler, currentNamedImageIndex]);
    const goToNextAttempt = useCallback(() => onPrevNextAttemptHandler(1), [onPrevNextAttemptHandler]);
    const goToPrevAttempt = useCallback(() => onPrevNextAttemptHandler(-1), [onPrevNextAttemptHandler]);

    const onSelectFirstResult = useCallback(() => {
        if (treeData.tree.length > 0) {
            const firstItem = treeData.tree[0]?.data;
            if (firstItem) {
                onImageChange(firstItem);
            }
        }
    }, [treeData.tree, onImageChange]);

    useHotkey('ArrowDown', goToNextImage);
    useHotkey('ArrowUp', goToPrevImage);
    useHotkey('ArrowRight', goToNextAttempt);
    useHotkey('ArrowLeft', goToPrevAttempt);

    useEffect(() => {
        if (imageChanged && currentBrowser) {
            dispatch(changeTestRetry({browserId: currentBrowser?.id, retryIndex: lastAttempt}));
            setImageChanged(false);
        }
    }, [imageChanged, currentBrowser]);

    useEffect(() => {
        if (hash && currentImageStateName && attempt !== null) {
            navigate(getUrl({
                page: Page.visualChecksPage,
                hash,
                browser: currentBrowser?.name,
                attempt: attempt,
                stateName: currentImageStateName
            }));
        }
    }, [hash, currentBrowser, currentImageStateName, attempt]);

    useEffect(() => {
        if (isInitialized && !inited.current) {
            inited.current = true;

            if (params) {
                if (urlBrowserId && params.stateName) {
                    dispatch(visualChecksPageSetCurrentNamedImage({
                        currentBrowserId: urlBrowserId,
                        stateName: params.stateName
                    }));
                } else if (currentNamedImage) {
                    dispatch(visualChecksPageSetCurrentNamedImage({
                        currentBrowserId: currentNamedImage?.browserId,
                        stateName: currentNamedImage?.stateName
                    }));
                }
            }
        }
    }, [urlBrowserId, params, isInitialized, currentNamedImage]);

    const statusValue = useSelector(getVisualChecksViewMode);

    const sectionSizes = useSelector(state => state.ui[Page.visualChecksPage].sectionSizes);

    const onSectionSizesChange = (sizes: number[]): void => {
        dispatch(actions.setSectionSizes({sizes, page: Page.visualChecksPage}));
        if (isSectionHidden(sizes[0])) {
            dispatch(
                actions.setBackupSectionSizes({sizes: [MIN_SECTION_SIZE_PERCENT, 100 - MIN_SECTION_SIZE_PERCENT], page: Page.visualChecksPage})
            );
        } else {
            dispatch(
                actions.setBackupSectionSizes({sizes, page: Page.visualChecksPage})
            );
        }
    };

    const statusList = useMemo(() => (
        [
            {
                title: 'All',
                value: ViewMode.ALL,
                count: treeData.stats[ViewMode.ALL]
            },
            {
                icon: getIconByStatus(TestStatus.SUCCESS),
                title: 'Passed',
                value: ViewMode.PASSED,
                count: treeData.stats[ViewMode.PASSED]
            },
            {
                icon: getIconByStatus(TestStatus.FAIL),
                title: 'Failed',
                value: ViewMode.FAILED,
                count: treeData.stats[ViewMode.FAILED]
            }
        ]
    ), [treeData]);

    const onStatusChange = useCallback((value: string) => {
        dispatch(actions.changeViewMode({
            data: value as ViewMode,
            page
        }));
    }, [page]);

    return (
        <div className={styles.container}>
            <SplitViewLayout sizes={sectionSizes} onSizesChange={onSectionSizesChange}>
                <SideBar
                    ref={sideBarRef}
                    title="Visual Checks"
                    isInitialized={isInitialized}
                    treeViewRef={suitesTreeViewRef}
                    onSelectFirstTreeItem={onSelectFirstResult}
                    treeData={treeData}
                    treeViewExpandedById={{}}
                    currentTreeNodeId={currentTreeNodeId}
                    onClick={onImageChange}
                    statusList={statusList}
                    statusValue={statusValue}
                    onStatusChange={onStatusChange}
                />
                <UiCard key="test-view" className={classNames(styles.card, styles.testViewCard)}>
                    <ErrorHandler.Boundary fallback={<ErrorHandler.FallbackCardCrash recommendedAction={'Try to reload page'} />}>
                        {isInitialized
                            ? <>
                                {currentNamedImage && (
                                    <VisualChecksStickyHeader
                                        currentNamedImage={currentNamedImage}
                                        treeData={treeData}
                                        onImageChange={onImageChange}
                                    />
                                )}

                                {currentImage && !isRunning && (
                                    <ErrorHandler.Boundary fallback={<ErrorHandler.FallbackCardCrash recommendedAction={'Try to choose another item'}/>}>
                                        <div className={styles.currentImage}>
                                            <AssertViewResult result={currentImage} diffMode={diffMode} />
                                        </div>
                                    </ErrorHandler.Boundary>
                                )}

                                {!currentImage && !isRunning && (
                                    <div className={styles.hint}>This run doesn&apos;t have an image with id &quot;{params.imageId}&quot;</div>
                                )}
                                {isRunning && (
                                    <RunTestLoading />
                                )}
                            </>
                            : <AssertViewResultSkeleton />}
                    </ErrorHandler.Boundary>
                </UiCard>
            </SplitViewLayout>
        </div>
    );
}
