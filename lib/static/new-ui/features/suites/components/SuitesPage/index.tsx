import {Flex} from '@gravity-ui/uikit';
import classNames from 'classnames';
import React, {ReactNode} from 'react';
import {connect, useSelector} from 'react-redux';
import {useParams} from 'react-router-dom';
import {bindActionCreators} from 'redux';

import {TestSteps} from '@/static/new-ui/features/suites/components/TestSteps';
import {UiCard} from '@/static/new-ui/components/Card/UiCard';
import {getCurrentResult} from '@/static/new-ui/features/suites/selectors';
import {getTreeViewItems} from '@/static/new-ui/features/suites/components/SuitesTreeView/selectors';
import {SplitViewLayout} from '@/static/new-ui/components/SplitViewLayout';
import {TestNameFilter} from '@/static/new-ui/features/suites/components/TestNameFilter';
import {SuitesTreeView} from '@/static/new-ui/features/suites/components/SuitesTreeView';
import {TestStatusFilter} from '@/static/new-ui/features/suites/components/TestStatusFilter';
import {BrowsersSelect} from '@/static/new-ui/features/suites/components/BrowsersSelect';
import {SuiteTitle} from '../../../../components/SuiteTitle';
import * as actions from '@/static/modules/actions';
import {CollapsibleSection} from '@/static/new-ui/features/suites/components/CollapsibleSection';
import {MetaInfo} from '@/static/new-ui/components/MetaInfo';
import {getIsInitialized} from '@/static/new-ui/store/selectors';
import {ResultEntity, State} from '@/static/new-ui/types/store';
import {AttemptPicker} from '../../../../components/AttemptPicker';

import styles from './index.module.css';
import {TestInfoSkeleton} from '@/static/new-ui/features/suites/components/SuitesPage/TestInfoSkeleton';
import {TreeViewSkeleton} from '@/static/new-ui/features/suites/components/SuitesTreeView/TreeViewSkeleton';

interface SuitesPageProps {
    actions: typeof actions;
    currentResult: ResultEntity | null;
    visibleBrowserIds: string[];
}

function SuitesPageInternal({currentResult, actions, visibleBrowserIds}: SuitesPageProps): ReactNode {
    const currentIndex = visibleBrowserIds.indexOf(currentResult?.parentId as string);
    const onPreviousSuiteHandler = (): void => void actions.suitesPageSetCurrentSuite(visibleBrowserIds[currentIndex - 1]);
    const onNextSuiteHandler = (): void => void actions.suitesPageSetCurrentSuite(visibleBrowserIds[currentIndex + 1]);

    const {suiteId: suiteIdParam} = useParams();
    const isInitialized = useSelector(getIsInitialized);

    return <div className={styles.container}><SplitViewLayout sections={[
        <UiCard key='tree-view' className={classNames(styles.card, styles.treeViewCard)}>
            <h2 className={classNames('text-display-1', styles['card__title'])}>Suites</h2>
            <Flex gap={2}>
                <TestNameFilter/>
                <BrowsersSelect/>
            </Flex>
            <TestStatusFilter/>
            {isInitialized && <SuitesTreeView/>}
            {!isInitialized && <TreeViewSkeleton/>}
        </UiCard>,
        <UiCard key="test-view" className={classNames(styles.card, styles.testViewCard)}>
            {currentResult && <>
                <div className={styles.stickyHeader}>
                    <SuiteTitle
                        className={styles['card__title']}
                        suitePath={currentResult.suitePath}
                        browserName={currentResult.name}
                        index={currentIndex}
                        totalItems={visibleBrowserIds.length}
                        onNext={onNextSuiteHandler}
                        onPrevious={onPreviousSuiteHandler} />
                    <AttemptPicker onChange={(browserId, _, retryIndex): unknown => actions.changeTestRetry({browserId, retryIndex})} />
                </div>
                <CollapsibleSection className={styles['collapsible-section-overview']} title={'Overview'} body={currentResult && <div className={styles['collapsible-section__body']}>
                    <MetaInfo resultId={currentResult.id} />
                </div>} id={'overview'}/>
                <TestSteps />
            </>}
            {!suiteIdParam && !currentResult && <div className={styles.hintContainer}><span className={styles.hint}>Select a test to see details</span></div>}
            {suiteIdParam && !isInitialized && <TestInfoSkeleton />}
        </UiCard>
    ]} /></div>;
}

export const SuitesPage = connect(
    (state: State) => {
        const currentResult = getCurrentResult(state);

        return {
            currentResult,
            visibleBrowserIds: getTreeViewItems(state).visibleBrowserIds
        };
    },
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(SuitesPageInternal);
