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
import {SideBar} from '@/static/new-ui/components/SideBar';
import {getVisualChecksViewMode, getVisualTreeViewData} from './selectors';
import {TreeViewHandle} from '@/static/new-ui/components/TreeView';
import {TreeViewItemData} from '@/static/new-ui/features/suites/components/SuitesPage/types';
import {Page, TestStatus, ViewMode} from '@/constants';
import {getIconByStatus} from '@/static/new-ui/utils';
import {isSectionHidden} from '@/static/new-ui/features/suites/utils';
import {MIN_SECTION_SIZE_PERCENT} from '@/static/new-ui/features/suites/constants';
import {usePage} from '@/static/new-ui/hooks/usePage';
import {useNavigate, useParams} from 'react-router-dom';
import {RunTestLoading} from '@/static/new-ui/components/RunTestLoading';
import {getUrl} from '@/static/new-ui/utils/getUrl';

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

    const currentImageSuiteId = useSelector((state) => (
        state.app.visualChecksPage.suiteId
    ));

    const currentImageStateName = useSelector((state) => (
        state.app.visualChecksPage.stateName
    ));

    const currentTreeNodeId = useMemo(
        () => [currentImageSuiteId, currentImageStateName].join(' '),
        [currentImageSuiteId, currentImageStateName]
    );

    const treeData = useSelector(getVisualTreeViewData);
    const suitesTreeViewRef = useRef<TreeViewHandle>(null);

    useEffect(() => {
        suitesTreeViewRef?.current?.scrollToId(currentTreeNodeId as string);
    }, [suitesTreeViewRef, currentTreeNodeId]);

    const isInitialized = useSelector(state => state.app.isInitialized);

    const onImageChange = useCallback((item: TreeViewItemData) => {
        dispatch(visualChecksPageSetCurrentNamedImage({
            suiteId: item.suiteId,
            stateName: item.stateName
        }));
        setImageChanged(true);
    }, [treeData]);

    useEffect(() => {
        if (imageChanged && currentBrowser) {
            dispatch(changeTestRetry({browserId: currentBrowser?.id, retryIndex: lastAttempt}));
            setImageChanged(false);
        }
    }, [imageChanged, currentBrowser]);

    useEffect(() => {
        if (currentImageSuiteId && currentImageStateName && attempt !== null) {
            navigate(getUrl({
                page: Page.visualChecksPage,
                suiteId: currentImageSuiteId,
                attempt: attempt,
                stateName: currentImageStateName
            }));
        }
    }, [currentImageSuiteId, currentImageStateName, attempt]);

    useEffect(() => {
        if (isInitialized && !inited.current) {
            inited.current = true;

            if (params) {
                if (params.suiteId && params.stateName) {
                    dispatch(visualChecksPageSetCurrentNamedImage({
                        suiteId: params.suiteId,
                        stateName: params.stateName
                    }));
                } else if (currentNamedImage) {
                    dispatch(visualChecksPageSetCurrentNamedImage({
                        suiteId: currentNamedImage?.browserId,
                        stateName: currentNamedImage?.stateName
                    }));
                }
            }
        }
    }, [params, isInitialized, currentNamedImage]);

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
                    title="Visual Checks"
                    isInitialized={isInitialized}
                    treeViewRef={suitesTreeViewRef}
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
