import React, {ChangeEvent, ReactNode, useCallback, useState} from 'react';
import {debounce} from 'lodash';
import {connect, useSelector} from 'react-redux';
import {bindActionCreators} from 'redux';
import {Icon, TextInput} from '@gravity-ui/uikit';
import {FontCase} from '@gravity-ui/icons';
import * as actions from '@/static/modules/actions';
import {getIsInitialized} from '@/static/new-ui/store/selectors';
import {TestNameFilterButton} from '@/static/new-ui/features/suites/components/TestNameFilter/TestNameFilterButton';
import styles from './index.module.css';

interface TestNameFilterProps {
    testNameFilter: string;
    useRegexFilter: boolean,
    useMatchCaseFilter: boolean,
    actions: typeof actions;
}

function TestNameFilterInternal(props: TestNameFilterProps): ReactNode {
    const [testNameFilter, setTestNameFilter] = useState(props.testNameFilter);

    const updateTestNameFilter = useCallback(debounce(
        (testName) => props.actions.updateTestNameFilter(testName),
        500,
        {maxWait: 3000}
    ), []);

    const onChange = useCallback((event: ChangeEvent<HTMLInputElement>): void => {
        setTestNameFilter(event.target.value);
        updateTestNameFilter(event.target.value);
    }, [setTestNameFilter, updateTestNameFilter]);

    const isInitialized = useSelector(getIsInitialized);

    const onCaseSensitiveClick = (): void => {
        props.actions.setMatchCaseFilter(!props.useMatchCaseFilter);
    };

    const onRegexClick = (): void => {
        props.actions.setUseRegexFilter(!props.useRegexFilter);
    };

    return <div className={styles.container}>
        <TextInput
            disabled={!isInitialized}
            placeholder="Search or filter"
            value={testNameFilter}
            onChange={onChange}
            className={styles['search-input']}
        />
        <div className={styles['buttons-wrapper']}>
            <TestNameFilterButton
                selected={props.useMatchCaseFilter}
                tooltip={'Match case'}
                onClick={onCaseSensitiveClick}
            >
                <Icon data={FontCase}/>
            </TestNameFilterButton>
            <TestNameFilterButton
                selected={props.useRegexFilter}
                tooltip={'Regex'}
                onClick={onRegexClick}
                className={styles['buttons-wrapper__regex']}
            >
                .*
            </TestNameFilterButton>
        </div>
    </div>;
}

export const TestNameFilter = connect(
    state => ({
        testNameFilter: state.view.testNameFilter,
        useRegexFilter: state.view.useRegexFilter,
        useMatchCaseFilter: state.view.useMatchCaseFilter
    }),
    (dispatch) => ({
        actions: bindActionCreators(actions, dispatch)
    })
)(TestNameFilterInternal);
