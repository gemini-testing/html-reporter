'use strict';

import React, {useState} from 'react';
import PropTypes from 'prop-types';
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import {Checkbox} from 'semantic-ui-react';
import * as actions from '../../modules/actions';

const StrictMatchFilterInput = ({strictMatchFilter, actions}) => {
    const [checked, setChecked] = useState(strictMatchFilter);

    const onChange = () => {
        const newState = !checked;
        setChecked(newState);
        actions.setStrictMatchFilter(newState);
    };

    return (
        <div className="strict-match-filter">
            <Checkbox
                toggle
                label="Strict match"
                onChange={onChange}
                checked={checked}
            />
        </div>
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
