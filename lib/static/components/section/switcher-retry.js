'use strict';

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export default class SwitcherRetry extends Component {
    static propTypes = {
        testResults: PropTypes.array.isRequired,
        onChange: PropTypes.func.isRequired,
        retryIndex: PropTypes.number.isRequired
    }

    constructor(props) {
        super(props);
        this.state = {retry: this.props.retryIndex};
    }

    render() {
        const {testResults} = this.props;

        if (testResults.length <= 1) {
            return null;
        }

        const buttonsTmpl = [];

        for (let i = 0; i < testResults.length; i++) {
            const currStatus = testResults[i].status;
            const className = classNames(
                'state-button',
                'tab-switcher__button',
                {[`tab-switcher__button_status_${currStatus}`]: currStatus},
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
