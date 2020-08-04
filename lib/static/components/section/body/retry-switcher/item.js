import React, {Component} from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import {connect} from 'react-redux';

class RetrySwitcherItem extends Component {
    static propTypes = {
        resultId: PropTypes.string.isRequired,
        isActive: PropTypes.bool.isRequired,
        onClick: PropTypes.func.isRequired,
        // from store
        status: PropTypes.string.isRequired
    }

    render() {
        const {status, isActive, onClick, children} = this.props;

        const className = classNames(
            'state-button',
            'tab-switcher__button',
            {[`tab-switcher__button_status_${status}`]: status},
            {'tab-switcher__button_active': isActive}
        );

        return <button className={className} onClick={onClick}>{children}</button>;
    }
}

export default connect(
    ({tree}, {resultId}) => {
        const result = tree.results.byId[resultId];

        return {status: result.status};
    }
)(RetrySwitcherItem);
