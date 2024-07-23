import React from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';
import classNames from 'classnames';

import * as actions from '../../modules/actions';
import Suites from '../suites';
import {INDETERMINATE} from '../../../constants/checked-statuses';
import {getToggledCheckboxState} from '../../../common-utils';
import Bullet from '../bullet';

const GroupTestsItem = ({group, isActive, onClick, checkStatus, actions}) => {
    const {name, pattern, testCount, resultCount} = group;

    const body = isActive ? (
        <div className="tests-group__body">
            <Suites />
        </div>
    ) : null;

    const className = classNames(
        'tests-group',
        {'tests-group_collapsed': !isActive}
    );

    const onToggleCheckbox = (e) => {
        e.stopPropagation();

        actions.toggleGroupCheckbox({
            browserIds: group.browserIds,
            checkStatus: getToggledCheckboxState(checkStatus)
        });
    };

    return (
        <div className={className}>
            <div className="tests-group__title" onClick={onClick} title={pattern}>
                <Bullet status={checkStatus} onClick={onToggleCheckbox} className='tests-group__bullet'/>
                <span className="tests-group__name">{name}</span>
                <span className="tests-group__count">&nbsp;({`tests: ${testCount}, runs: ${resultCount}`})</span>
            </div>
            {body}
        </div>
    );
};

GroupTestsItem.propTypes = {
    actions: PropTypes.object.isRequired,
    group: PropTypes.object.isRequired,
    isActive: PropTypes.bool.isRequired,
    onClick: PropTypes.func.isRequired,
    checkStatus: PropTypes.number
};

export default connect(
    ({tree}, {group}) => {
        const childCount = group.browserIds.length;
        const checkedCount = group.browserIds.reduce((sum, browserId) => {
            return sum + tree.browsers.stateById[browserId].checkStatus;
        }, 0);
        const checkStatus = Number((checkedCount === childCount) || (checkedCount && INDETERMINATE));

        return {checkStatus};
    },
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(GroupTestsItem);
