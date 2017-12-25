'use strict';

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export default class ControlButton extends Component {
    static propTypes = {
        label: PropTypes.string.isRequired,
        handler: PropTypes.func.isRequired,
        isActive: PropTypes.bool.isRequired
    }

    render() {
        const {label, handler, isActive} = this.props;
        const className = classNames('button', {'button_checked': isActive});

        return (<button onClick={handler} className={className}>{label}</button>);
    }
}
