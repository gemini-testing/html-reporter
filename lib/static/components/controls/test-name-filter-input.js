'use strict';

import React, {useState, useCallback} from 'react';
import PropTypes from 'prop-types';
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import {debounce} from 'lodash';
import * as actions from '../../modules/actions';

const TestNameFilterInput = ({actions, testNameFilter: testNameFilterProp}) => {
    const [testNameFilter, setTestNameFilter] = useState(testNameFilterProp);

    const _debouncedUpdate = useCallback(debounce(
        (testName) => actions.updateTestNameFilter(testName),
        500,
        {maxWait: 3000}
    ), []);

    const onChange = (event) => {
        setTestNameFilter(event.target.value);
        _debouncedUpdate(event.target.value);
    };

    return (
        <input
            className="filter__input-name"
            value={testNameFilter}
            placeholder="filter by test name"
            onChange={onChange}
        />
    );
};

TestNameFilterInput.propTypes = {
    testNameFilter: PropTypes.string.isRequired,
    actions: PropTypes.object.isRequired
};

export default connect(
    (state) => ({testNameFilter: state.view.testNameFilter}),
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(TestNameFilterInput);
