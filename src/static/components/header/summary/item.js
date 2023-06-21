'use strict';

import React, {Component, Fragment} from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

export default class SummaryItem extends Component {
    static propTypes = {
        id: PropTypes.oneOf(['total', 'passed', 'failed', 'retries', 'skipped']).isRequired,
        label: PropTypes.string.isRequired,
        value: PropTypes.number
    }

    render() {
        const {id, label, value} = this.props;
        const className = classNames(
            'summary__key',
            `summary__key_${id}`
        );

        return (
            <Fragment>
                <dt className={className}>{label}</dt>
                <dd className="summary__value">{value}</dd>
            </Fragment>
        );
    }
}
