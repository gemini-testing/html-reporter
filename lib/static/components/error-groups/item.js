'use strict';

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import Suites from '../suites';

export default class ErrorGroupsItem extends Component {
    state = {
        collapsed: true
    };

    static propTypes = {
        group: PropTypes.object.isRequired
    }

    _toggleState = () => {
        this.setState({collapsed: !this.state.collapsed});
    }

    render() {
        const {name, pattern, count, tests} = this.props.group;

        const body = this.state.collapsed
            ? null
            : <div className="error-group__body">
                <Suites errorGroupTests={tests}/>
            </div>;

        const className = classNames(
            'error-group',
            {'error-group_collapsed': this.state.collapsed}
        );

        return (
            <div className={className}>
                <div className="error-group__title" onClick={this._toggleState} title={pattern}>
                    <span className="error-group__name">{name}</span>
                    <span className="error-group__count">&nbsp;({count})</span>
                </div>
                {body}
            </div>
        );
    }
}
