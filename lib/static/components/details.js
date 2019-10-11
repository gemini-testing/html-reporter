'use strict';

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import {isEmpty} from 'lodash';

export default class Details extends Component {
    static propTypes = {
        title: PropTypes.oneOfType([PropTypes.element, PropTypes.string]).isRequired,
        content: PropTypes.oneOfType([PropTypes.string, PropTypes.element, PropTypes.array]).isRequired,
        extendClassNames: PropTypes.oneOfType([PropTypes.array, PropTypes.string])
    };

    render() {
        const {title, content, extendClassNames} = this.props;
        const className = classNames(
            'details',
            extendClassNames
        );

        return (
            isEmpty(content) ? (
                <div className={className}>
                    {title}
                </div>
            ) : (
                <details className={className}>
                    <summary className='details__summary'>
                        {title}
                    </summary>
                    <div className='details__content'>
                        {content}
                    </div>
                </details>
            )
        );
    }
}
