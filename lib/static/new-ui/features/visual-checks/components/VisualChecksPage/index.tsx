import classNames from 'classnames';
import React, {ReactNode, useCallback, useEffect, useMemo, useRef} from 'react';
import {useDispatch, useSelector} from 'react-redux';

import {SplitViewLayout} from '@/static/new-ui/components/SplitViewLayout';
import {UiCard} from '@/static/new-ui/components/Card/UiCard';
import {getCurrentImage, getCurrentNamedImage, getNamedImages} from '@/static/new-ui/features/visual-checks/selectors';
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
import {getVisualChecksViewMode, getVisualThreeViewData} from './selectors';
import {TreeViewHandle} from '@/static/new-ui/components/TreeView';
import {TreeViewItemData} from '@/static/new-ui/features/suites/components/SuitesPage/types';
import {TestStatus, ViewMode} from '@/constants';
import {getIconByStatus} from '@/static/new-ui/utils';
import {isSectionHidden} from '@/static/new-ui/features/suites/utils';
import {MIN_SECTION_SIZE_PERCENT} from '@/static/new-ui/features/suites/constants';
import {Pages} from '@/static/new-ui/types/store';

export function VisualChecksPage(): ReactNode {
    const dispatch = useDispatch();
    const currentNamedImage = useSelector(getCurrentNamedImage);
    const currentImage = useSelector(getCurrentImage);
    const namedImages = useSelector(getNamedImages);

    const currentTreeNodeId = useSelector((state) => state.app.visualChecksPage.currentNamedImageId);

    const treeData = useSelector(getVisualThreeViewData);
    const suitesTreeViewRef = useRef<TreeViewHandle>(null);

    useEffect(() => {
        suitesTreeViewRef?.current?.scrollToId(currentTreeNodeId as string);
    }, [suitesTreeViewRef, currentTreeNodeId]);

    const isInitialized = useSelector(state => state.app.isInitialized);
    const onImageChange = useCallback((imageId: string) => {
        dispatch(visualChecksPageSetCurrentNamedImage(imageId));
    }, []);
    const onThreeItemClick = useCallback((item: TreeViewItemData) => {
        dispatch(visualChecksPageSetCurrentNamedImage(item.id));
    }, []);

    const statusValue = useSelector(getVisualChecksViewMode);

    const sectionSizes = useSelector(state => state.ui[Pages.visualChecksPage].sectionSizes);

    const onSectionSizesChange = (sizes: number[]): void => {
        dispatch(actions.setSectionSizes({sizes, page: Pages.visualChecksPage}));
        if (isSectionHidden(sizes[0])) {
            dispatch(
                actions.setBackupSectionSizes({sizes: [MIN_SECTION_SIZE_PERCENT, 100 - MIN_SECTION_SIZE_PERCENT], page: Pages.visualChecksPage})
            );
        } else {
            dispatch(
                actions.setBackupSectionSizes({sizes, page: Pages.visualChecksPage})
            );
        }
    };

    const statusList = useMemo(() => {
        const namedImagesList = Object.values(namedImages);

        return [
            {
                title: 'All',
                value: ViewMode.ALL,
                count: namedImagesList.length
            },
            {
                icon: getIconByStatus(TestStatus.SUCCESS),
                title: 'Passed',
                value: ViewMode.PASSED,
                count: namedImagesList.filter(({status}) => status === TestStatus.SUCCESS).length
            },
            {
                icon: getIconByStatus(TestStatus.FAIL),
                title: 'Failed',
                value: ViewMode.FAILED,
                count: namedImagesList.filter(({status}) => status === TestStatus.FAIL).length
            }
        ];
    }, [namedImages]);

    const onStatusChange = useCallback((value: string) => {
        dispatch(actions.changeVisualCheksViewMode(value as ViewMode));
    }, []);

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
                    onClick={onThreeItemClick}
                    statusList={statusList}
                    statusValue={statusValue}
                    onStatusChange={onStatusChange}
                    hideSearch
                />
                <UiCard key="test-view" className={classNames(styles.card, styles.testViewCard)}>
                    <ErrorHandler.Boundary fallback={<ErrorHandler.FallbackCardCrash recommendedAction={'Try to reload page'} />}>
                        {isInitialized
                            ? <>
                                {currentNamedImage && (
                                    <VisualChecksStickyHeader
                                        currentNamedImage={currentNamedImage}
                                        onImageChange={onImageChange}
                                    />
                                )}

                                {currentImage && <ErrorHandler.Boundary fallback={<ErrorHandler.FallbackCardCrash recommendedAction={'Try to choose another item'}/>}>
                                    <AssertViewResult result={currentImage} />
                                </ErrorHandler.Boundary>}

                                {!currentImage && <div className={styles.hint}>This run doesn&apos;t have an image with name &quot;{currentNamedImage?.stateName}&quot;</div>}
                            </>
                            : <AssertViewResultSkeleton />}
                    </ErrorHandler.Boundary>
                </UiCard>
            </SplitViewLayout>
        </div>
    );
}
