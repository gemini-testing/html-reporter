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
        isDisabled: PropTypes.bool,
        isSuiteControl: PropTypes.bool,
        isControlGroup: PropTypes.bool
    }

    render() {
        const {label, handler, isActive, isAction, isSuiteControl, isControlGroup, isDisabled = false} = this.props;
        const className = classNames(
            'button',
            {'button_type_suite-controls': isSuiteControl},
            {'button_checked': isActive},
            {'button_type_action': isAction},
            {'control-group__item': isControlGroup}
        );

        return (<button onClick={handler} className={className} disabled={isDisabled}>{label}</button>);
    }
}
