'use strict';

import React, {Component, Fragment} from 'react';
import PropTypes from 'prop-types';
import {isEmpty, map} from 'lodash';
import ReactHtmlParser from 'react-html-parser';
import Screenshot from './screenshot';
import {isNoRefImageError} from '../../modules/utils';
import ErrorDetails from './error-details';
import Details from '../details';
import {ERROR_TITLE_TEXT_LENGTH} from '../../../constants/errors';

export default class StateError extends Component {
    static propTypes = {
        image: PropTypes.bool.isRequired,
        error: PropTypes.object.isRequired,
        actualImg: PropTypes.object,
        errorPattern: PropTypes.object
    };

    render() {
        const {image, error, errorDetails, actualImg, errorPattern = {}} = this.props;
        const extendedError = isEmpty(errorPattern)
            ? error
            : {...error, message: `${errorPattern.name}\n${error.message}`, hint: parseHtmlString(errorPattern.hint)};

        return (
            <div className="image-box__image image-box__image_single">
                <div className="error">{this._errorToElements(extendedError)}</div>
                {errorDetails && <ErrorDetails errorDetails={errorDetails}/>}
                {this._drawImage(image, actualImg)}
            </div>
        );
    }

    _drawImage(image, actualImg) {
        if (!image) {
            return null;
        }

        return isNoRefImageError(this.props.error)
            ? <Screenshot image={actualImg} />
            : <Details title="Page screenshot" content={<Screenshot image={actualImg} noLazyLoad={true} />} />;
    }

    _errorToElements(error) {
        return map(error, (value, key) => {
            if (!value) {
                return null;
            }

            let titleText = '';
            let content = '';

            if (typeof value === 'string') {
                if (value.match(/\n/)) {
                    [titleText, ...content] = value.split('\n');
                } else if (value.length < ERROR_TITLE_TEXT_LENGTH) {
                    titleText = value;
                } else {
                    [titleText, ...content] = splitBySpace(value);
                }

                if (Array.isArray(content)) {
                    content = content.join('\n');
                }
            } else {
                titleText = <span style={{color: '#ccc'}}>show more</span>;
                content = value;
            }

            const title = <Fragment><span className="error__item-key">{key}: </span>{titleText}</Fragment>;

            return <Details
                key={key}
                title={title}
                content={content}
                extendClassNames="error__item"
            />;
        });
    }
}

function parseHtmlString(str = '') {
    const html = str ? ReactHtmlParser(str) : null;

    return Array.isArray(html) && html.length === 1 ? html[0] : html;
}

function splitBySpace(str) {
    const spaceIndex = str.slice(0, ERROR_TITLE_TEXT_LENGTH).lastIndexOf(' ');
    const breakIndex = spaceIndex === -1 ? ERROR_TITLE_TEXT_LENGTH : spaceIndex;

    return [str.slice(0, breakIndex), str.slice(breakIndex + 1)];
}
