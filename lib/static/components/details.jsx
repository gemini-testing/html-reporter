'use strict';

import React, {useContext, useLayoutEffect, useState} from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import {isEmpty, isFunction} from 'lodash';
import {Disclosure} from '@gravity-ui/uikit';
import {MeasurementContext} from './measurement-context';

export default function Details(props) {
    const [isOpened, setIsOpened] = useState(false);

    const handleClick = () => {
        const newIsOpened = !isOpened;

        setIsOpened(newIsOpened);
        props.onClick?.({isOpened: newIsOpened});
    };

    const getContent = () => {
        const {content} = props;

        return isFunction(content) ? content() : content;
    };

    const renderContent = () => {
        if (!isOpened) {
            return null;
        }

        const children = props.asHtml ? null : getContent();
        const extraProps = props.asHtml ? {dangerouslySetInnerHTML: {__html: getContent()}} : {};

        return <div className='details__content' {...extraProps}>
            {children}
        </div>;
    };

    const {title, content, extendClassNames} = props;
    const className = classNames(
        'details',
        extendClassNames
    );

    const {measure} = useContext(MeasurementContext);
    useLayoutEffect(() => {
        measure?.();
    }, [isOpened]);

    return (
        isEmpty(content) && !isFunction(content) ? (
            <div className={className}>
                {title}
            </div>
        ) : (
            <Disclosure className={className} onUpdate={handleClick} size='l' expanded={isOpened}>
                <Disclosure.Summary>
                    {(props, defaultButton) => (
                        <div className={classNames(className, 'details__summary')} aria-controls={props.ariaControls} onClick={props.onClick} id={props.id}>
                            <div className="details__expand-button" onClick={e => e.stopPropagation()}>
                                {defaultButton}
                            </div>
                            {title}
                        </div>
                    )}
                </Disclosure.Summary>
                {renderContent()}
            </Disclosure>
        )
    );
}

Details.propTypes = {
    id: PropTypes.string,
    ariaControls: PropTypes.arrayOf(PropTypes.string),
    title: PropTypes.oneOfType([PropTypes.element, PropTypes.string]).isRequired,
    content: PropTypes.oneOfType([PropTypes.func, PropTypes.string, PropTypes.element, PropTypes.array]).isRequired,
    extendClassNames: PropTypes.oneOfType([PropTypes.array, PropTypes.string]),
    onClick: PropTypes.func,
    asHtml: PropTypes.bool
};
