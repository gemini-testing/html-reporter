'use strict';

import React, {Component} from 'react';
import classNames from 'classnames';
import {Button} from 'semantic-ui-react';

interface PropTypes {
    label: string;
    handler: () => any;
    isActive?: boolean;
    isAction?: boolean;
    isDisabled?: boolean;
    isSuiteControl?: boolean;
    isControlGroup?: boolean;
}

export default class ControlButton extends Component<PropTypes> {

    render() {
        const {label, handler, isActive, isAction, isSuiteControl, isControlGroup, isDisabled = false} = this.props;
        const className = classNames(
            'button',
            {'button_type_suite-controls': isSuiteControl},
            {'button_checked': isActive},
            {'button_type_action': isAction},
            {'control-group__item': isControlGroup}
        );

        return (<Button onClick={handler} className={className} disabled={isDisabled}>{label}</Button>);
    }
}
