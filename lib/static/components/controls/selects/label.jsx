import React, {Component} from 'react';
import { Label } from '@gravity-ui/uikit';
import './index.styl';
import classNames from 'classnames';

const CustomLabel = ({className, ...otherProps}) => {
    return (<Label className={classNames('custom-label', className)} {...otherProps}></Label>)
}

export default CustomLabel;