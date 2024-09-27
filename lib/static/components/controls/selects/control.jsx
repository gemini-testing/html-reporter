import React, {Component} from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import './index.styl';
import {Select} from '@gravity-ui/uikit';
import CustomLabel from './label';

export default class ControlSelect extends Component {
    static propTypes = {
        size: PropTypes.string,
        label: PropTypes.string.isRequired,
        value: PropTypes.string.isRequired,
        handler: PropTypes.func.isRequired,
        options: PropTypes.arrayOf(PropTypes.shape({
            value: PropTypes.string,
            text: PropTypes.string
        })).isRequired,
        extendClassNames: PropTypes.oneOfType([PropTypes.array, PropTypes.string]),
        extendPopupClassNames: PropTypes.oneOfType([PropTypes.array, PropTypes.string]),
        qa: PropTypes.string
    };

    _onUpdate = (values) => {
        if (values.length) {
            this.props.handler(values[0]);
        }
    };

    render() {
        const {size, value, label, options, extendClassNames, extendPopupClassNames, qa} = this.props;

        const className = classNames(
            'select',
            'select_type_control',
            extendClassNames
        );

        const popupClassNames = classNames(
            extendPopupClassNames
        );

        return (
            <div className={className}>
                <CustomLabel size='m' pin='round-brick'>{label}</CustomLabel>
                <Select
                    disablePortal
                    className={`select__dropdown-${size || 's'}`}
                    selection
                    options={options}
                    value={[value]}
                    onUpdate={this._onUpdate}
                    pin='brick-round'
                    qa={qa}
                    popupClassName={popupClassNames}
                />
            </div>
        );
    }
}
