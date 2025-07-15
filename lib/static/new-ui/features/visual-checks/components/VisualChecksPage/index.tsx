import classNames from 'classnames';
import React, {ReactNode, useCallback, useEffect, useMemo, useRef} from 'react';
import {useDispatch, useSelector} from 'react-redux';

import {SplitViewLayout} from '@/static/new-ui/components/SplitViewLayout';
import {UiCard} from '@/static/new-ui/components/Card/UiCard';
import {getCurrentImage, getCurrentNamedImage} from '@/static/new-ui/features/visual-checks/selectors';
import {AssertViewResult} from '@/static/new-ui/components/AssertViewResult';
import styles from './index.module.css';
import {
    AssertViewResultSkeleton
} from '@/static/new-ui/features/visual-checks/components/VisualChecksPage/AssertViewResultSkeleton';
import {VisualChecksStickyHeader} from './VisualChecksStickyHeader';
import {ErrorHandler} from '../../../error-handling/components/ErrorHandling';
import * as actions from '@/static/modules/actions';
import {visualChecksPageSetCurrentNamedImage} from '@/static/modules/actions';
import {SideBar} from '@/static/new-ui/components/SideBar';
import {getVisualChecksViewMode, getVisualTreeViewData} from './selectors';
import {TreeViewHandle} from '@/static/new-ui/components/TreeView';
import {TreeViewItemData} from '@/static/new-ui/features/suites/components/SuitesPage/types';
import {TestStatus, ViewMode} from '@/constants';
import {getIconByStatus} from '@/static/new-ui/utils';
import {isSectionHidden} from '@/static/new-ui/features/suites/utils';
import {MIN_SECTION_SIZE_PERCENT} from '@/static/new-ui/features/suites/constants';
import {Page} from '@/static/new-ui/types/store';
import {usePage} from '@/static/new-ui/hooks/usePage';

export function VisualChecksPage(): ReactNode {
    const dispatch = useDispatch();
    const page = usePage();
    const currentNamedImage = useSelector(getCurrentNamedImage);
    const currentImage = useSelector(getCurrentImage);

    const currentTreeNodeId = useSelector((state) => state.app.visualChecksPage.currentNamedImageId);

    const treeData = useSelector(getVisualTreeViewData);
    const suitesTreeViewRef = useRef<TreeViewHandle>(null);

    useEffect(() => {
        suitesTreeViewRef?.current?.scrollToId(currentTreeNodeId as string);
    }, [suitesTreeViewRef, currentTreeNodeId]);

    const isInitialized = useSelector(state => state.app.isInitialized);
    const onImageChange = useCallback((imageId: string) => {
        dispatch(visualChecksPageSetCurrentNamedImage(imageId));
    }, []);
    const onTreeItemClick = useCallback((item: TreeViewItemData) => {
        dispatch(visualChecksPageSetCurrentNamedImage(item.id));
    }, []);

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

    const statusList = useMemo(() => {
        return [
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
        ];
    }, [treeData]);

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
                    onClick={onTreeItemClick}
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
                                        visibleNamedImageIds={treeData.allTreeNodeIds}
                                        onImageChange={onImageChange}
                                    />
                                )}

                                {currentImage && (
                                    <ErrorHandler.Boundary fallback={<ErrorHandler.FallbackCardCrash recommendedAction={'Try to choose another item'}/>}>
                                        <div className={styles.currentImage}>
                                            <AssertViewResult result={currentImage} />
                                        </div>
                                    </ErrorHandler.Boundary>
                                )}

                                {!currentImage && (
                                    <div className={styles.hint}>This run doesn&apos;t have an image with name &quot;{currentNamedImage?.stateName}&quot;</div>
                                )}
                            </>
                            : <AssertViewResultSkeleton />}
                    </ErrorHandler.Boundary>
                </UiCard>
            </SplitViewLayout>
        </div>
    );
}
