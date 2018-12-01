'use strict';

import React, {Component} from 'react';
import classNames from 'classnames';
import {Button} from 'semantic-ui-react';

interface IControlButton {
    label: string;
    handler: () => any;
    isActive?: boolean;
    isAction?: boolean;
    isDisabled?: boolean;
    isSuiteControl?: boolean;
    isControlGroup?: boolean;
}

export default class ControlButton extends Component<IControlButton> {

    render() {
        const {label, handler, isSuiteControl, isControlGroup, isDisabled = false} = this.props;
        const className = classNames(
            'button',
            {'button_type_suite-controls': isSuiteControl},
            {'control-group__item': isControlGroup}
        );

        return (<Button onClick={handler} className={className} disabled={isDisabled}>{label}</Button>);
    }
}
