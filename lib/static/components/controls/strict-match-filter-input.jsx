'use strict';

import React, {useState} from 'react';
import PropTypes from 'prop-types';
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import * as actions from '../../modules/actions';
import {Switch} from '@gravity-ui/uikit';

const StrictMatchFilterInput = ({strictMatchFilter, actions}) => {
    const [checked, setChecked] = useState(strictMatchFilter);

    const onChange = () => {
        const newState = !checked;
        setChecked(newState);
        actions.setStrictMatchFilter(newState);
    };

    return (
        <Switch size='m' content="Strict match" checked={checked} onChange={onChange} qa="header-strict-match"/>
    );
};

StrictMatchFilterInput.propTypes = {
    strictMatchFilter: PropTypes.bool.isRequired,
    actions: PropTypes.object.isRequired
};

export default connect(
    (state) => ({strictMatchFilter: state.view.strictMatchFilter}),
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(StrictMatchFilterInput);
