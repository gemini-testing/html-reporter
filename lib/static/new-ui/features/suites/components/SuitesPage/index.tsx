import {Flex} from '@gravity-ui/uikit';
import classNames from 'classnames';
import React, {ReactNode, useRef} from 'react';
import {connect, useSelector} from 'react-redux';
import {useParams} from 'react-router-dom';
import {bindActionCreators} from 'redux';

import {TestSteps} from '@/static/new-ui/features/suites/components/TestSteps';
import {UiCard} from '@/static/new-ui/components/Card/UiCard';
import {getCurrentResult} from '@/static/new-ui/features/suites/selectors';
import {getTreeViewItems} from '@/static/new-ui/features/suites/components/SuitesTreeView/selectors';
import {SplitViewLayout} from '@/static/new-ui/components/SplitViewLayout';
import {TestNameFilter} from '@/static/new-ui/features/suites/components/TestNameFilter';
import {SuitesTreeView, SuitesTreeViewHandle} from '@/static/new-ui/features/suites/components/SuitesTreeView';
import {TestStatusFilter} from '@/static/new-ui/features/suites/components/TestStatusFilter';
import {BrowsersSelect} from '@/static/new-ui/features/suites/components/BrowsersSelect';
import {SuiteTitle} from '../../../../components/SuiteTitle';
import * as actions from '@/static/modules/actions';
import {CollapsibleSection} from '@/static/new-ui/features/suites/components/CollapsibleSection';
import {MetaInfo} from '@/static/new-ui/components/MetaInfo';
import {getIsInitialized} from '@/static/new-ui/store/selectors';
import {ResultEntity} from '@/static/new-ui/types/store';
import {AttemptPicker} from '../../../../components/AttemptPicker';

import styles from './index.module.css';
import {TestInfoSkeleton} from '@/static/new-ui/features/suites/components/SuitesPage/TestInfoSkeleton';
import {TreeViewSkeleton} from '@/static/new-ui/features/suites/components/SuitesTreeView/TreeViewSkeleton';
import {TreeActionsToolbar} from '@/static/new-ui/features/suites/components/TreeActionsToolbar';
import {findTreeNodeById, getGroupId} from '@/static/new-ui/features/suites/utils';
import {TreeViewItemData} from '@/static/new-ui/features/suites/components/SuitesPage/types';
import {NEW_ISSUE_LINK} from '@/constants';
import {ErrorHandler} from '../../../error-handling/components/ErrorHandling';

interface SuitesPageProps {
    actions: typeof actions;
    currentResult: ResultEntity | null;
    treeNodeId: string | null;
}

function SuitesPageInternal({currentResult, actions, treeNodeId}: SuitesPageProps): ReactNode {
    const {visibleTreeNodeIds, tree} = useSelector(getTreeViewItems);

    const currentTreeNodeId = useSelector(state => state.app.suitesPage.currentTreeNodeId);
    const currentIndex = visibleTreeNodeIds.indexOf(currentTreeNodeId as string);

    const onPrevNextSuiteHandler = (step: number): void => {
        const treeNodeId = visibleTreeNodeIds[currentIndex + step];
        const currentTreeNode = findTreeNodeById(tree, treeNodeId ?? '');
        if (!currentTreeNode) {
            console.warn(`Couldn't find tree node by id in prev/next handler. ID: ${currentTreeNodeId}. Tree: ${JSON.stringify(tree)}` +
                `Please report this to our team at ${NEW_ISSUE_LINK}.`);
            return;
        }

        const groupId = getGroupId(currentTreeNode as TreeViewItemData);

        actions.setCurrentTreeNode({treeNodeId, browserId: currentTreeNode.entityId, groupId});
    };

    const {suiteId: suiteIdParam} = useParams();
    const isInitialized = useSelector(getIsInitialized);

    const suitesTreeViewRef = useRef<SuitesTreeViewHandle>(null);

    const onHighlightCurrentTest = (): void => {
        if (suitesTreeViewRef.current && currentResult?.parentId) {
            suitesTreeViewRef.current.scrollToId(currentTreeNodeId as string);
        }
    };

    const onAttemptChangeHandler = (browserId: string, _: unknown, retryIndex: number): void => {
        actions.changeTestRetry({
            browserId,
            retryIndex,
            suitesPage: treeNodeId ? {treeNodeId} : undefined
        });
    };

    return <div className={styles.container}>
        <SplitViewLayout sections={[
            <UiCard className={classNames(styles.card, styles.treeViewCard)} key='tree-view'>
                <ErrorHandler.Root fallback={<ErrorHandler.FallbackDataCorruption />}>
                    <h2 className={classNames('text-display-1', styles['card__title'])}>Suites</h2>
                    <Flex gap={2}>
                        <TestNameFilter/>
                        <BrowsersSelect/>
                    </Flex>
                    <TestStatusFilter/>
                    <TreeActionsToolbar onHighlightCurrentTest={onHighlightCurrentTest} />
                    {isInitialized && <SuitesTreeView ref={suitesTreeViewRef}/>}
                    {!isInitialized && <TreeViewSkeleton/>}
                </ErrorHandler.Root>
            </UiCard>,

            <UiCard className={classNames(styles.card, styles.testViewCard)} key="test-view">
                <ErrorHandler.Root watchFor={[currentResult, suiteIdParam, isInitialized]} fallback={<ErrorHandler.FallbackCardCrash />}>
                    {currentResult && <>
                        <div className={styles.stickyHeader}>
                            <SuiteTitle
                                className={styles['card__title']}
                                suitePath={currentResult.suitePath}
                                browserName={currentResult.name}
                                index={currentIndex}
                                totalItems={visibleTreeNodeIds.length}
                                onNext={(): void => onPrevNextSuiteHandler(1)}
                                onPrevious={(): void => onPrevNextSuiteHandler(-1)} />
                            <AttemptPicker onChange={onAttemptChangeHandler} />
                        </div>

                        <CollapsibleSection title={'Overview'} id={'overview'} className={styles['collapsible-section-overview']} body={
                            currentResult &&
                            <div className={styles['collapsible-section__body']}>
                                <ErrorHandler.Root watchFor={[currentResult]} fallback={<ErrorHandler.FallbackDataCorruption />}>
                                    <MetaInfo resultId={currentResult.id} />
                                </ErrorHandler.Root>
                            </div>
                        }/>

                        <CollapsibleSection title={'Steps'} id={'steps'} body={
                            <ErrorHandler.Root watchFor={[currentResult]} fallback={<ErrorHandler.FallbackDataCorruption />}>
                                <TestSteps />
                            </ErrorHandler.Root>
                        }/>

                    </>}

                    {!suiteIdParam && !currentResult && <div className={styles.hintContainer}><span className={styles.hint}>Select a test to see details</span></div>}
                    {suiteIdParam && !isInitialized && <TestInfoSkeleton />}
                </ErrorHandler.Root>
            </UiCard>
        ]} />
    </div>;
}

export const SuitesPage = connect(
    state => {
        const currentResult = getCurrentResult(state);
        const treeNodeId = state.app.suitesPage.currentTreeNodeId;

        return {
            currentResult,
            treeNodeId
        };
    },
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(SuitesPageInternal);
