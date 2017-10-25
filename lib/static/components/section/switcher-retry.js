'use strict';

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export default class SwitcherRetry extends Component {
    static propTypes = {
        retries: PropTypes.array,
        onChange: PropTypes.func.isRequired
    }

    static defaultProps = {
        retries: []
    }

    constructor(props) {
        super(props);
        this.state = {retry: this.props.retries.length};
    }

    render() {
        const retries = this.props.retries;

        if (retries.length === 0) {
            return null;
        }

        const buttonsTmpl = [];
        for (let i = 0; i <= retries.length; i++) {
            const className = classNames(
                'state-button',
                'tab-switcher__button',
                {'tab-switcher__button_active': i === this.state.retry}
            );
            buttonsTmpl.push(
                <button key={i} className={className} onClick={() => this._onChange(i)}>{i + 1}</button>
            );
        }

        return (<div className="tab-switcher">{buttonsTmpl}</div>);
    }

    _onChange(index) {
        this.setState({retry: index});
        this.props.onChange(index);
    }
}

