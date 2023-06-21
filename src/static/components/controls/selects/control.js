import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {Label, Dropdown} from 'semantic-ui-react';
import classNames from 'classnames';

import './index.styl';

export default class ControlSelect extends Component {
    static propTypes = {
        label: PropTypes.string.isRequired,
        value: PropTypes.string.isRequired,
        handler: PropTypes.func.isRequired,
        options: PropTypes.arrayOf(PropTypes.shape({
            value: PropTypes.string,
            text: PropTypes.string
        })).isRequired,
        extendClassNames: PropTypes.oneOfType([PropTypes.array, PropTypes.string])
    }

    _onChange = (_, dom) => {
        this.props.handler(dom.value);
    }

    render() {
        const {value, label, options, extendClassNames} = this.props;
        const formattedOpts = options.map(({value, text}) => ({
            value,
            text,
            key: value
        }));

        const className = classNames(
            'select',
            'select_type_control',
            extendClassNames
        );

        return (
            <div className={className}>
                <Label className="select__label">{label}</Label>
                <Dropdown
                    className="select__dropdown"
                    selection
                    options={formattedOpts}
                    value={value}
                    onChange={this._onChange}
                />
            </div>
        );
    }
}
