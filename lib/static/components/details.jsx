'use strict';

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import {isEmpty, isFunction} from 'lodash';
import { Card, Disclosure } from '@gravity-ui/uikit';

export default class Details extends Component {
    static propTypes = {
        title: PropTypes.oneOfType([PropTypes.element, PropTypes.string]).isRequired,
        content: PropTypes.oneOfType([PropTypes.func, PropTypes.string, PropTypes.element, PropTypes.array]).isRequired,
        extendClassNames: PropTypes.oneOfType([PropTypes.array, PropTypes.string]),
        onClick: PropTypes.func,
        asHtml: PropTypes.bool,
    };

    state = {isOpened: false};

    handleClick = () => {
        this.setState((state, props) => {
            const newState = {isOpened: !state.isOpened};

            if (props.onClick) {
                props.onClick(newState);
            }

            return newState;
        });
    };

    _getContent() {
        const content = this.props.content;

        return isFunction(content) ? content() : content
    }

    _renderContent() {
        if (!this.state.isOpened) {
            return null;
        }

        const children = this.props.asHtml ? null : this._getContent();
        const extraProps = this.props.asHtml ? {dangerouslySetInnerHTML: {__html: this._getContent()}} : {};

        return <div className='details__content' {...extraProps}>
            {children}
        </div>
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
                <Disclosure className={className} onUpdate={this.handleClick} 
                     size='l'>
                        <Disclosure.Summary>
                            {(props, defaultButton) => (
                                <div className={className}><div className='details__expand-button'>{defaultButton}</div>{title}</div>
                            )}
                        </Disclosure.Summary>
                    <Card className='details__card'>
                        {this._renderContent()}
                    </Card>
                </Disclosure>
            )
        );
    }
}
