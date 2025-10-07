import classNames from 'classnames';
import React, {ReactNode, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {useNavigate, useParams} from 'react-router-dom';

import {UiCard} from '@/static/new-ui/components/Card/UiCard';
import {getAttempt, getCurrentResult, getCurrentResultImages} from '@/static/new-ui/features/suites/selectors';
import {SplitViewLayout} from '@/static/new-ui/components/SplitViewLayout';
import {TreeViewHandle} from '@/static/new-ui/components/TreeView';
import {SuiteTitle} from '@/static/new-ui/components/SuiteTitle';
import * as actions from '@/static/modules/actions';
import {getIsInitialized} from '@/static/new-ui/store/selectors';
import {TestControlPanel} from '@/static/new-ui/features/suites/components/TestControlPanel';

import styles from './index.module.css';
import {TestInfoSkeleton} from '@/static/new-ui/features/suites/components/SuitesPage/TestInfoSkeleton';
import {
    findTreeNodeByBrowserId,
    findTreeNodeById,
    getGroupId,
    isSectionHidden
} from '@/static/new-ui/features/suites/utils';
import {EntityType, TreeViewItemData} from '@/static/new-ui/features/suites/components/SuitesPage/types';
import {NEW_ISSUE_LINK, TestStatus, ViewMode} from '@/constants';
import {ErrorHandler} from '../../../error-handling/components/ErrorHandling';
import {TestInfo} from '@/static/new-ui/features/suites/components/TestInfo';
import {MIN_SECTION_SIZE_PERCENT} from '../../constants';
import {SideBar} from '@/static/new-ui/components/SideBar';
import {getSuitesStatusCounts, getSuitesTreeViewData} from './selectors';
import {getIconByStatus} from '@/static/new-ui/utils';
import {Page} from '@/static/new-ui/types/store';
import {usePage} from '@/static/new-ui/hooks/usePage';
import {changeTestRetry, setCurrentTreeNode, setStrictMatchFilter} from '@/static/modules/actions';

export function SuitesPage(): ReactNode {
    const page = usePage();
    const currentResult = useSelector(getCurrentResult);
    const treeData = useSelector(getSuitesTreeViewData);
    const resultImages = useSelector(getCurrentResultImages);
    const {visibleTreeNodeIds, tree} = treeData;
    const params = useParams();
    const attempt = useSelector(getAttempt);
    const currentBrowser = useSelector(state => state.app[Page.suitesPage].currentBrowserId);

    const currentTreeNodeId = useSelector(state => state.app[Page.suitesPage].currentTreeNodeId);
    const currentIndex = visibleTreeNodeIds.indexOf(currentTreeNodeId as string);

    const isInitialized = useSelector(getIsInitialized);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const statusValue = useSelector((state) => state.app[page].viewMode);
    const statusCounts = useSelector((state) => getSuitesStatusCounts(state));
    const onStatusChange = useCallback((value: string) => {
        dispatch(actions.changeViewMode({
            data: value as ViewMode,
            page
        }));
    }, [page]);

    useEffect(() => {
        if (currentResult?.parentId && attempt !== null && resultImages.length) {
            navigate('/' + [
                'suites',
                currentResult.parentId as string,
                params.stateName !== undefined ? params.stateName : resultImages[0].stateName as string,
                attempt?.toString() as string
            ].map(encodeURIComponent).join('/'));
        }
    }, [currentResult, attempt]);

    useEffect(() => {
        if (currentBrowser === params.suiteId) {
            return;
        }

        if (isInitialized && params.suiteId) {
            dispatch(setStrictMatchFilter(false));

            const treeNode = findTreeNodeByBrowserId(treeData.tree, params.suiteId);

            if (!treeNode) {
                return;
            }

            dispatch(setCurrentTreeNode({browserId: params.suiteId, treeNodeId: treeNode.id}));

            if (params.attempt !== undefined) {
                dispatch(changeTestRetry({browserId: params.suiteId, retryIndex: Number(params.attempt)}));
            }
        }
    }, [isInitialized, params]);

    const suitesTreeViewRef = useRef<TreeViewHandle>(null);

    useEffect(() => {
        suitesTreeViewRef?.current?.scrollToId(currentTreeNodeId as string);
    }, [suitesTreeViewRef, currentTreeNodeId]);

    const treeViewExpandedById = useSelector((state) => state.ui[Page.suitesPage].expandedTreeNodesById);

    const statusList = useMemo(() => [
        {
            title: 'All',
            value: ViewMode.ALL,
            count: statusCounts.total
        },
        {
            icon: getIconByStatus(TestStatus.SUCCESS),
            title: 'Passed',
            value: ViewMode.PASSED,
            count: statusCounts.success
        },
        {
            icon: getIconByStatus(TestStatus.FAIL),
            title: 'Failed',
            value: ViewMode.FAILED,
            count: statusCounts.fail
        },
        {
            icon: getIconByStatus(TestStatus.RETRY),
            title: 'Retried',
            value: ViewMode.RETRIED,
            count: statusCounts.retried
        },
        {
            icon: getIconByStatus(TestStatus.SKIPPED),
            title: 'Skipped',
            value: ViewMode.SKIPPED,
            count: statusCounts.skipped
        }
    ], [statusCounts]);

    const onPrevNextSuiteHandler = (step: number): void => {
        const treeNodeId = visibleTreeNodeIds[currentIndex + step];
        const currentTreeNode = findTreeNodeById(tree, treeNodeId ?? '');
        if (!currentTreeNode) {
            console.warn(`Couldn't find tree node by id in prev/next handler. ID: ${currentTreeNodeId}. Tree: ${JSON.stringify(tree)}` +
                `Please report this to our team at ${NEW_ISSUE_LINK}.`);
            return;
        }

        const groupId = getGroupId(currentTreeNode as TreeViewItemData);

        dispatch(actions.setCurrentTreeNode({treeNodeId, browserId: currentTreeNode.entityId, groupId}));

        suitesTreeViewRef?.current?.scrollToId(treeNodeId as string);
    };

    const onHighlightCurrentTest = (): void => {
        if (suitesTreeViewRef.current && currentResult?.parentId) {
            suitesTreeViewRef.current.scrollToId(currentTreeNodeId as string);
        }
    };

    const onTreeItemClick = useCallback((item: TreeViewItemData, expanded: boolean) => {
        if (item.entityType === EntityType.Browser) {
            dispatch(actions.setCurrentTreeNode({treeNodeId: item.id, browserId: item.entityId, groupId: getGroupId(item)}));
        } else {
            dispatch(actions.setTreeNodeExpandedState({nodeId: item.id, isExpanded: !expanded}));
        }
    }, []);

    const onAttemptChangeHandler = (browserId: string, _: unknown, retryIndex: number): void => {
        dispatch(
            actions.changeTestRetry({
                browserId,
                retryIndex,
                [Page.suitesPage]: currentTreeNodeId ? {treeNodeId: currentTreeNodeId} : undefined
            })
        );
    };

    const onSectionSizesChange = (sizes: number[]): void => {
        dispatch(actions.setSectionSizes({sizes, page: Page.suitesPage}));
        if (isSectionHidden(sizes[0])) {
            dispatch(actions.setBackupSectionSizes({sizes: [MIN_SECTION_SIZE_PERCENT, 100 - MIN_SECTION_SIZE_PERCENT], page: Page.suitesPage}));
        } else {
            dispatch(actions.setBackupSectionSizes({sizes, page: Page.suitesPage}));
        }
    };

    const sectionSizes = useSelector(state => state.ui[Page.suitesPage].sectionSizes);

    const [stickyHeaderElement, setStickyHeaderElement] = useState<HTMLDivElement | null>(null);
    const [stickyHeaderHeight, setStickyHeaderHeight] = useState(0);
    useLayoutEffect(() => {
        if (!stickyHeaderElement) {
            return;
        }
        setStickyHeaderHeight(stickyHeaderElement.clientHeight);
        const resizeObserver = new ResizeObserver((entries) => {
            setStickyHeaderHeight(entries[0].contentRect.height);
        });
        resizeObserver.observe(stickyHeaderElement);

        return () => resizeObserver.disconnect();
    }, [stickyHeaderElement]);

    return (
        <div className={styles.container}>
            <SplitViewLayout sizes={sectionSizes} onSizesChange={onSectionSizesChange}>
                <SideBar
                    title="Suites"
                    onHighlightCurrentTest={onHighlightCurrentTest}
                    isInitialized={isInitialized}
                    treeViewRef={suitesTreeViewRef}
                    treeData={treeData}
                    treeViewExpandedById={treeViewExpandedById}
                    currentTreeNodeId={currentTreeNodeId}
                    onClick={onTreeItemClick}
                    statusList={statusList}
                    statusValue={statusValue}
                    onStatusChange={onStatusChange}
                />
                <UiCard key="test-view" className={classNames(styles.card, styles.testViewCard)} style={{'--sticky-header-height': stickyHeaderHeight + 'px'} as React.CSSProperties}>
                    <ErrorHandler.Boundary watchFor={[currentResult, params.suiteId, isInitialized]} fallback={<ErrorHandler.FallbackCardCrash recommendedAction={'Try to choose another item'}/>}>
                        {currentResult && <>
                            <div className={styles.stickyHeader} ref={(ref): void => setStickyHeaderElement(ref)}>
                                <SuiteTitle
                                    className={styles['card__title']}
                                    suitePath={currentResult.suitePath}
                                    browserName={currentResult.name}
                                    index={currentIndex}
                                    totalItems={visibleTreeNodeIds.length}
                                    onNext={(): void => onPrevNextSuiteHandler(1)}
                                    onPrevious={(): void => onPrevNextSuiteHandler(-1)}/>
                                <TestControlPanel onAttemptChange={onAttemptChangeHandler}/>
                            </div>

                            <TestInfo/>
                        </>}
                        {!params.suiteId && !currentResult && <div className={styles.hintContainer}><span className={styles.hint}>Select a test to see details</span></div>}
                        {params.suiteId && !isInitialized && <TestInfoSkeleton />}
                    </ErrorHandler.Boundary>
                </UiCard>
            </SplitViewLayout>
        </div>
    );
}
