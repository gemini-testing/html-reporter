import React, {Component} from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import Suites from '../suites';

export default class ErrorGroupsItem extends Component {
    static propTypes = {
        group: PropTypes.object.isRequired,
        isActive: PropTypes.bool.isRequired,
        onClick: PropTypes.func.isRequired
    }

    render() {
        const {group, isActive, onClick} = this.props;
        const {name, pattern, count} = group;

        const body = isActive ? (
            <div className="error-group__body">
                <Suites />
            </div>
        ) : null;

        const className = classNames(
            'error-group',
            {'error-group_collapsed': !isActive}
        );

        return (
            <div className={className}>
                <div className="error-group__title" onClick={onClick} title={pattern}>
                    <span className="error-group__name">{name}</span>
                    <span className="error-group__count">&nbsp;({count})</span>
                </div>
                {body}
            </div>
        );
    }
}
