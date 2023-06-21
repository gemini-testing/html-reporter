import React, {Component} from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import Suites from '../suites';

export default class GroupTestsItem extends Component {
    static propTypes = {
        group: PropTypes.object.isRequired,
        isActive: PropTypes.bool.isRequired,
        onClick: PropTypes.func.isRequired
    }

    render() {
        const {group, isActive, onClick} = this.props;
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

        return (
            <div className={className}>
                <div className="tests-group__title" onClick={onClick} title={pattern}>
                    <span className="tests-group__name">{name}</span>
                    <span className="tests-group__count">&nbsp;({`tests: ${testCount}, runs: ${resultCount}`})</span>
                </div>
                {body}
            </div>
        );
    }
}
