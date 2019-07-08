'use strict';

import React, {Component, Fragment} from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export default class SummaryItem extends Component {
    static propTypes = {
        label: PropTypes.string.isRequired,
        value: PropTypes.number.isRequired,
        isFailed: PropTypes.bool
    }

    render() {
        const {label, value, isFailed = false} = this.props;

        if (isFailed && value === 0) {
            return null;
        }

        const className = classNames(
            'summary__key',
            {'summary__key_has-fails': isFailed}
        );

        return (
            <Fragment>
                <dt className={className}>{label}</dt>
                <dd className="summary__value">{value}</dd>
            </Fragment>
        );
    }
}
