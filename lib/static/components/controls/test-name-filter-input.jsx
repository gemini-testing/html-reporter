'use strict';

import React, {useState, useCallback} from 'react';
import PropTypes from 'prop-types';
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import {debounce} from 'lodash';
import * as actions from '../../modules/actions';
import {TextInput} from '@gravity-ui/uikit';

const TestNameFilterInput = ({actions, testNameFilter: testNameFilterProp}) => {
    const [testNameFilter, setTestNameFilter] = useState(testNameFilterProp);

    const _debouncedUpdate = useCallback(debounce(
        (testName) => actions.updateNameFilter({
            data: testName,
            page: 'suitesPage'
        }),
        500,
        {maxWait: 3000}
    ), []);

    const onChange = (event) => {
        setTestNameFilter(event.target.value);
        _debouncedUpdate(event.target.value);
    };

    return (
        <TextInput
            size='m'
            className='test-name-filter'
            value={testNameFilter}
            placeholder="Filter by test name or regexp"
            onChange={onChange}
            qa="header-test-name-filter"
        />
    );
};

TestNameFilterInput.propTypes = {
    testNameFilter: PropTypes.string.isRequired,
    actions: PropTypes.object.isRequired
};

export default connect(
    (state) => ({testNameFilter: state.app.suitesPage.nameFilter}),
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(TestNameFilterInput);
