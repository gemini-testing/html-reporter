'use strict';

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export default class ControlButton extends Component {
    static propTypes = {
        label: PropTypes.string.isRequired,
        handler: PropTypes.func.isRequired,
        isActive: PropTypes.bool,
        isAction: PropTypes.bool,
        isDisabled: PropTypes.bool
    }

    render() {
        const {label, handler, isActive, isAction, isDisabled = false} = this.props;
        const className = classNames(
            'button',
            {'button_checked': isActive},
            {'button_type_action': isAction}
        );

        return (<button onClick={handler} className={className} disabled={isDisabled}>{label}</button>);
    }
}
