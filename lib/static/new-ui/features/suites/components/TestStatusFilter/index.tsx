import {RadioButton} from '@gravity-ui/uikit';
import React, {ReactNode} from 'react';
import {connect, useSelector} from 'react-redux';
import {bindActionCreators} from 'redux';

import {TestStatus, ViewMode} from '@/constants';
import * as actions from '@/static/modules/actions';
import {getStatusCounts, StatusCounts} from '@/static/new-ui/features/suites/components/TestStatusFilter/selectors';
import {getIconByStatus} from '@/static/new-ui/utils';
import {getIsInitialized} from '@/static/new-ui/store/selectors';
import styles from './index.module.css';

interface TestStatusFilterOptionProps {
    status: TestStatus | 'total';
    count: number;
}

function TestStatusFilterOption(props: TestStatusFilterOptionProps): ReactNode {
    return <div className={styles['test-status-filter-option']}>
        {props.status === 'total' ? <span>All</span> : getIconByStatus(props.status)}<span className={styles['test-status-filter-option__count']}>{props.count}</span>
    </div>;
}

interface TestStatusFilterProps {
    statusCounts: StatusCounts;
    actions: typeof actions;
    viewMode: ViewMode;
}

function TestStatusFilterInternal({statusCounts, actions, viewMode}: TestStatusFilterProps): ReactNode {
    const isInitialized = useSelector(getIsInitialized);

    return <RadioButton disabled={!isInitialized} className={styles.testStatusFilter} width={'max'} onChange={(e): void => void actions.changeViewMode(e.target.value)} value={viewMode}>
        <RadioButton.Option title={'All'} value={ViewMode.ALL} content={<TestStatusFilterOption status={'total'} count={statusCounts.total}/>} />
        <RadioButton.Option title={'Passed'} value={ViewMode.PASSED} content={<TestStatusFilterOption status={TestStatus.SUCCESS} count={statusCounts.success}/>} />
        <RadioButton.Option title={'Failed'} value={ViewMode.FAILED} content={<TestStatusFilterOption status={TestStatus.FAIL} count={statusCounts.fail}/>} />
        <RadioButton.Option title={'Retried'} value={ViewMode.RETRIED} content={<TestStatusFilterOption status={TestStatus.RETRY} count={statusCounts.retried}/>} />
        <RadioButton.Option title={'Skipped'} value={ViewMode.SKIPPED} content={<TestStatusFilterOption status={TestStatus.SKIPPED} count={statusCounts.skipped}/>} />
    </RadioButton>;
}

export const TestStatusFilter = connect(
    state => ({
        statusCounts: getStatusCounts(state),
        viewMode: state.view.viewMode
    }),
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(TestStatusFilterInternal);
