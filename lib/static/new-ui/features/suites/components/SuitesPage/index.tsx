import classNames from 'classnames';
import React, {ReactNode, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {useNavigate, useParams} from 'react-router-dom';
import {UiCard} from '@/static/new-ui/components/Card/UiCard';
import {
    getAttempt,
    getCurrentBrowser,
    getCurrentResult,
    getCurrentResultImages,
    getCurrentBrowserId
} from '@/static/new-ui/features/suites/selectors';
import {SplitViewLayout} from '@/static/new-ui/components/SplitViewLayout';
import {TreeViewHandle} from '@/static/new-ui/components/TreeView';
import {SideBarHandle} from '@/static/new-ui/components/SideBar';
import {SuiteTitle} from '@/static/new-ui/components/SuiteTitle';
import * as actions from '@/static/modules/actions';
import {getIsInitialized} from '@/static/new-ui/store/selectors';
import {TestControlPanel} from '@/static/new-ui/features/suites/components/TestControlPanel';
import {TestStatusBar} from '@/static/new-ui/features/suites/components/TestStatusBar';

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
import {getCurrentSuiteHash, getSuitesStatusCounts, getSuitesTreeViewData} from './selectors';
import {getIconByStatus} from '@/static/new-ui/utils';
import {Page} from '@/constants';
import {usePage} from '@/static/new-ui/hooks/usePage';
import {useHotkey} from '@/static/new-ui/hooks/useHotkey';
import {useLegacyUrlMigration} from '@/static/new-ui/hooks/useLegacyUrlMigration';
import {changeTestRetry, setCurrentTreeNode, setStrictMatchFilter} from '@/static/modules/actions';
import {getUrl} from '@/static/new-ui/utils/getUrl';

export function SuitesPage(): ReactNode {
    const page = usePage();

    useLegacyUrlMigration();

    const currentResult = useSelector(getCurrentResult);
    const treeData = useSelector(getSuitesTreeViewData);
    const resultImages = useSelector(getCurrentResultImages);
    const {visibleTreeNodeIds, tree} = treeData;
    const params = useParams();
    const attempt = useSelector(getAttempt);
    const currentBrowser = useSelector(state => state.app[Page.suitesPage].currentBrowserId);
    const hash = useSelector(getCurrentSuiteHash);
    const urlBrowserId = useSelector(getCurrentBrowserId(params));

    const currentTreeNodeId = useSelector(state => state.app[Page.suitesPage].currentTreeNodeId);
    const currentIndex = visibleTreeNodeIds.indexOf(currentTreeNodeId as string);
    const currentBrowserEntity = useSelector(getCurrentBrowser);
    const totalAttempts = currentBrowserEntity?.resultIds.length ?? 0;

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
        const stateName =
            (params.stateName && resultImages.some((item) => item.stateName === params.stateName)) ?
                params.stateName :
                (resultImages.length ? resultImages[0].stateName : undefined)
        ;

        if (currentResult?.parentId && attempt !== null) {
            navigate(getUrl({
                page: Page.suitesPage,
                attempt,
                hash,
                browser: currentResult.name,
                stateName
            }));
        }
    }, [currentResult, attempt, hash]);

    useEffect(() => {
        if (currentBrowser === urlBrowserId) {
            return;
        }

        if (isInitialized && urlBrowserId) {
            dispatch(setStrictMatchFilter(false));

            const treeNode = findTreeNodeByBrowserId(treeData.tree, urlBrowserId);

            if (!treeNode) {
                return;
            }

            dispatch(setCurrentTreeNode({browserId: urlBrowserId, treeNodeId: treeNode.id}));

            if (params.attempt !== undefined) {
                dispatch(changeTestRetry({browserId: urlBrowserId, retryIndex: Number(params.attempt)}));
            }
        }
    }, [isInitialized, params]);

    const suitesTreeViewRef = useRef<TreeViewHandle>(null);
    const sideBarRef = useRef<SideBarHandle>(null);

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

    const onPrevNextSuiteHandler = useCallback((step: number): void => {
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
    }, [visibleTreeNodeIds, currentIndex, tree, currentTreeNodeId, dispatch]);

    const onPrevNextAttemptHandler = useCallback((step: number): void => {
        if (!currentBrowser || attempt === null) {
            return;
        }

        const newAttempt = attempt + step;
        if (newAttempt < 0 || newAttempt >= totalAttempts) {
            return;
        }

        dispatch(actions.changeTestRetry({
            browserId: currentBrowser,
            retryIndex: newAttempt,
            [Page.suitesPage]: currentTreeNodeId ? {treeNodeId: currentTreeNodeId} : undefined
        }));
    }, [currentBrowser, attempt, totalAttempts, currentTreeNodeId, dispatch]);

    const goToNextSuite = useCallback(() => onPrevNextSuiteHandler(1), [onPrevNextSuiteHandler]);
    const goToPrevSuite = useCallback(() => {
        if (currentIndex === 0) {
            sideBarRef.current?.focusSearch();
            return;
        }
        onPrevNextSuiteHandler(-1);
    }, [onPrevNextSuiteHandler, currentIndex]);
    const goToNextAttempt = useCallback(() => onPrevNextAttemptHandler(1), [onPrevNextAttemptHandler]);
    const goToPrevAttempt = useCallback(() => onPrevNextAttemptHandler(-1), [onPrevNextAttemptHandler]);

    const onSelectFirstResult = useCallback(() => {
        if (visibleTreeNodeIds.length > 0) {
            const firstTreeNodeId = visibleTreeNodeIds[0];
            const firstTreeNode = findTreeNodeById(tree, firstTreeNodeId);
            if (firstTreeNode) {
                const groupId = getGroupId(firstTreeNode as TreeViewItemData);
                dispatch(actions.setCurrentTreeNode({treeNodeId: firstTreeNodeId, browserId: firstTreeNode.entityId, groupId}));
                suitesTreeViewRef?.current?.scrollToId(firstTreeNodeId);
            }
        }
    }, [visibleTreeNodeIds, tree, dispatch]);

    useHotkey('ArrowDown', goToNextSuite);
    useHotkey('ArrowUp', goToPrevSuite);
    useHotkey('ArrowRight', goToNextAttempt);
    useHotkey('ArrowLeft', goToPrevAttempt);

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

    const onBrowserChangeHandler = useCallback((newBrowserId: string): void => {
        const treeNode = findTreeNodeByBrowserId(tree, newBrowserId);
        if (!treeNode) {
            return;
        }

        const groupId = getGroupId(treeNode as TreeViewItemData);
        dispatch(actions.setCurrentTreeNode({treeNodeId: treeNode.id, browserId: newBrowserId, groupId}));
        suitesTreeViewRef?.current?.scrollToId(treeNode.id);
    }, [tree, dispatch]);

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
                    ref={sideBarRef}
                    title="Suites"
                    onHighlightCurrentTest={onHighlightCurrentTest}
                    isInitialized={isInitialized}
                    treeViewRef={suitesTreeViewRef}
                    onSelectFirstTreeItem={onSelectFirstResult}
                    treeData={treeData}
                    treeViewExpandedById={treeViewExpandedById}
                    currentTreeNodeId={currentTreeNodeId}
                    onClick={onTreeItemClick}
                    statusList={statusList}
                    statusValue={statusValue}
                    onStatusChange={onStatusChange}
                />
                <UiCard key="test-view" className={classNames(styles.card, styles.testViewCard)} style={{'--sticky-header-height': stickyHeaderHeight + 'px'} as React.CSSProperties}>
                    <ErrorHandler.Boundary watchFor={[currentResult, urlBrowserId, isInitialized]} fallback={<ErrorHandler.FallbackCardCrash recommendedAction={'Try to choose another item'}/>}>
                        {currentResult && <>
                            <div className={styles.stickyHeader} ref={(ref): void => setStickyHeaderElement(ref)}>
                                <SuiteTitle
                                    className={styles['card__title']}
                                    suitePath={currentResult.suitePath}
                                    index={currentIndex}
                                    totalItems={visibleTreeNodeIds.length}
                                    onNext={(): void => onPrevNextSuiteHandler(1)}
                                    onPrevious={(): void => onPrevNextSuiteHandler(-1)}/>
                                <TestControlPanel onAttemptChange={onAttemptChangeHandler} onBrowserChange={onBrowserChangeHandler}/>
                            </div>

                            <TestStatusBar />
                            <TestInfo/>
                        </>}
                        {!urlBrowserId && !currentResult && <div className={styles.hintContainer}><span className={styles.hint}>Select a test to see details</span></div>}
                        {urlBrowserId && !isInitialized && <TestInfoSkeleton />}
                    </ErrorHandler.Boundary>
                </UiCard>
            </SplitViewLayout>
        </div>
    );
}
