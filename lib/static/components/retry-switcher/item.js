import React, {Component} from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import {connect} from 'react-redux';
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
        attempt: PropTypes.number.isRequired
    }

    render() {
        const {status, attempt, isActive, onClick, title} = this.props;

        const className = classNames(
            'state-button',
            'tab-switcher__button',
            {[`tab-switcher__button_status_${status}`]: status},
            {'tab-switcher__button_active': isActive}
        );

        return <button title={title} className={className} onClick={onClick}>{attempt + 1}</button>;
    }
}

export default connect(
    ({tree}, {resultId}) => {
        const {status, attempt, error} = tree.results.byId[resultId];

        return !isFailStatus(status) || isNoRefImageError(error) || isAssertViewError(error)
            ? {status, attempt}
            : {status: `${status}_${ERROR}`, attempt};
    }
)(RetrySwitcherItem);
