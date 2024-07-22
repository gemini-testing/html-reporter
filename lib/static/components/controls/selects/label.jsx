import React from 'react';
import PropTypes from 'prop-types';
import {Label} from '@gravity-ui/uikit';
import './index.styl';
import classNames from 'classnames';

const CustomLabel = ({className, ...otherProps}) => {
    return (<Label className={classNames('custom-label', className)} {...otherProps}></Label>);
};

CustomLabel.propTypes = {
    className: PropTypes.string
};

export default CustomLabel;
