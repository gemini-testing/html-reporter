'use strict';

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export default class ControlButton extends Component {
    static propTypes = {
        label: PropTypes.oneOfType([PropTypes.string, PropTypes.object]).isRequired,
        title: PropTypes.string,
        handler: PropTypes.func.isRequired,
        isActive: PropTypes.bool,
        isAction: PropTypes.bool,
        isDisabled: PropTypes.bool,
        isSuiteControl: PropTypes.bool,
        isControlGroup: PropTypes.bool,
        isRunning: PropTypes.bool,
        extendClassNames: PropTypes.oneOfType([PropTypes.array, PropTypes.string])
    }

    render() {
        const {
            label,
            title,
            handler,
            isActive,
            isAction,
            isSuiteControl,
            isControlGroup,
            isDisabled = false,
            isRunning = false,
            extendClassNames
        } = this.props;

        const className = classNames(
            'button',
            {'button_type_suite-controls': isSuiteControl},
            {'button_checked': isActive},
            {'button_type_action': isAction},
            {'control-group__item': isControlGroup},
            {'button_blink': isRunning},
            extendClassNames
        );

        return <button
            title={title}
            onClick={handler}
            className={className}
            disabled={isDisabled}
        >
            {label}
        </button>;
    }
}
