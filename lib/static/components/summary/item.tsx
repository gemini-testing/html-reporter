'use strict';

import React, {Component, Fragment} from 'react';
import classNames from 'classnames';

interface ISummaryItemProps {
    label: string;
    value: number;
    isFailed?: boolean;
}
export default class SummaryItem extends Component<ISummaryItemProps> {

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
                <dd className='summary__value'>{value}</dd>
            </Fragment>
        );
    }
}
