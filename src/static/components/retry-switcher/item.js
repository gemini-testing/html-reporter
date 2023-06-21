import React, {Component} from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import {connect} from 'react-redux';
import {get} from 'lodash';
import {isNoRefImageError, isAssertViewError} from '../../modules/utils';
import {ERROR} from '../../../constants/test-statuses';
import {isFailStatus} from '../../../common-utils';

class RetrySwitcherItem extends Component {
    static propTypes = {
        resultId: PropTypes.string.isRequired,
        isActive: PropTypes.bool.isRequired,
        onClick: PropTypes.func.isRequired,
        title: PropTypes.string,
        // from store
        status: PropTypes.string.isRequired,
        attempt: PropTypes.number.isRequired,
        keyToGroupTestsBy: PropTypes.string.isRequired,
        matchedSelectedGroup: PropTypes.bool.isRequired
    }

    render() {
        const {status, attempt, isActive, onClick, title, keyToGroupTestsBy, matchedSelectedGroup} = this.props;

        const className = classNames(
            'state-button',
            'tab-switcher__button',
            {[`tab-switcher__button_status_${status}`]: status},
            {'tab-switcher__button_active': isActive},
            {'tab-switcher__button_non-matched': keyToGroupTestsBy && !matchedSelectedGroup}
        );

        return <button title={title} className={className} onClick={onClick}>{attempt + 1}</button>;
    }
}

export default connect(
    ({tree, view: {keyToGroupTestsBy}}, {resultId}) => {
        const result = tree.results.byId[resultId];
        const matchedSelectedGroup = get(tree.results.stateById[resultId], 'matchedSelectedGroup', false);
        const {status, attempt, error} = result;

        return {
            status: hasScreenAndAssertErrors(status, error) ? `${status}_${ERROR}` : status,
            attempt,
            keyToGroupTestsBy,
            matchedSelectedGroup
        };
    }
)(RetrySwitcherItem);

function hasScreenAndAssertErrors(status, error) {
    return isFailStatus(status) && error && !isNoRefImageError(error) && !isAssertViewError(error);
}
