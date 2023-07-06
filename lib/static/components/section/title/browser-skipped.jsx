'use strict';

import React from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';
import * as actions from '../../../modules/actions';
import {getToggledCheckboxState} from '../../../../common-utils';
import Bullet from '../../bullet';

const BrowserSkippedTitle = (props) => {
    const onToggleCheckbox = (e) => {
        e.stopPropagation();

        props.actions.toggleBrowserCheckbox({
            suiteBrowserId: props.browserId,
            checkStatus: getToggledCheckboxState(props.checkStatus)
        });
    };

    return (
        <div className="section__title section__title_skipped">
            <Bullet status={props.checkStatus} onClick={onToggleCheckbox} />
            {props.title}
        </div>
    );
};

BrowserSkippedTitle.propTypes = {
    title: PropTypes.object.isRequired,
    browserId: PropTypes.string.isRequired,
    // from store
    checkStatus: PropTypes.number.isRequired
};

export default connect(
    ({tree}, {browserId}) => ({checkStatus: tree.browsers.stateById[browserId].checkStatus}),
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(BrowserSkippedTitle);
