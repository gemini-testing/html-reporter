'use strict';

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export default class SwitcherStyle extends Component {
    static propTypes = {
        onChange: PropTypes.func.isRequired
    }

    constructor(props) {
        super(props);
        this.state = {color: 1};
    }

    render() {
        return (
            <div className="cswitcher">
                {this._drawButton(1)}
                {this._drawButton(2)}
                {this._drawButton(3)}
            </div>
        );
    }

    _drawButton(index) {
        const className = classNames(
            'state-button',
            'cswitcher__item',
            `cswitcher_color_${index}`,
            {'cswitcher__item_selected': index === this.state.color}
        );

        return (
            <button
                className={className}
                onClick={() => this._onChange(index)}>
                &nbsp;
            </button>
        );
    }

    _onChange(index) {
        this.setState({color: index});
        this.props.onChange(index);
    }
}

