import {TextInput} from '@gravity-ui/uikit';
import React, {ChangeEvent, ReactNode, useCallback, useState} from 'react';
import {debounce} from 'lodash';
import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';
import * as actions from '@/static/modules/actions';
import {State} from '@/static/new-ui/types/store';

interface TestNameFilterProps {
    testNameFilter: string;
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

    return <TextInput placeholder='Search or filter' value={testNameFilter} onChange={onChange}/>;
}

export const TestNameFilter = connect(
    (state: State) => ({testNameFilter: state.view.testNameFilter}),
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(TestNameFilterInternal);
