import React from 'react';

import PropTypes from 'prop-types';
import './color-border.css';

const nextColors = {
    'red': 'green',
    'green': 'blue',
    'blue': 'red'
};

export class ColorBorder extends React.Component {
    static propTypes = {
        children: PropTypes.oneOfType([PropTypes.element, PropTypes.string])
    };

    state = {color: 'red'};

    onBorderClick = (e) => {
        e.stopPropagation();
        this.setState(function(state) {
            return {
                color: nextColors[state.color]
            };
        });
    };

    render() {
        const className = `${this.state.color}-border basic-border`;
        return <div className={className} onClick={this.onBorderClick}>
            {this.props.children}
        </div>;
    }
}
