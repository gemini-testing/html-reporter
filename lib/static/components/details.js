'use strict';

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import {isEmpty, isFunction} from 'lodash';

export default class Details extends Component {
    static propTypes = {
        title: PropTypes.oneOfType([PropTypes.element, PropTypes.string]).isRequired,
        content: PropTypes.oneOfType([PropTypes.func, PropTypes.string, PropTypes.element, PropTypes.array]).isRequired,
        extendClassNames: PropTypes.oneOfType([PropTypes.array, PropTypes.string]),
        onClick: PropTypes.func
    };

    state = {isOpened: false};

    handleClick = () => {
        this.setState({isOpened: !this.state.isOpened});

        if (this.props.onClick) {
            this.props.onClick();
        }
    }

    render() {
        const {title, content, extendClassNames} = this.props;
        const className = classNames(
            'details',
            extendClassNames
        );

        return (
            isEmpty(content) && !isFunction(content) ? (
                <div className={className}>
                    {title}
                </div>
            ) : (
                <details className={className}>
                    <summary className='details__summary' onClick={this.handleClick}>
                        {title}
                    </summary>
                    {
                        this.state.isOpened
                            ? <div className='details__content'>
                                {isFunction(content) ? content() : content}
                            </div>
                            : null
                    }
                </details>
            )
        );
    }
}
