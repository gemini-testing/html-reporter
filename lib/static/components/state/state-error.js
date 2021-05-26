'use strict';

import React, {Component, Fragment} from 'react';
import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';
import PropTypes from 'prop-types';
import {isEmpty, map, isFunction} from 'lodash';
import ReactHtmlParser from 'react-html-parser';
import * as actions from '../../modules/actions';
import Screenshot from './screenshot';
import {isNoRefImageError} from '../../modules/utils';
import ErrorDetails from './error-details';
import Details from '../details';
import {ERROR_TITLE_TEXT_LENGTH} from '../../../constants/errors';

class StateError extends Component {
    static propTypes = {
        result: PropTypes.shape({
            error: PropTypes.object,
            errorDetails: PropTypes.object
        }).isRequired,
        image: PropTypes.shape({
            stateName: PropTypes.string,
            error: PropTypes.object,
            actualImg: PropTypes.object
        }).isRequired,
        // from store
        error: PropTypes.object.isRequired,
        errorDetails: PropTypes.object,
        errorPatterns: PropTypes.array.isRequired
    };

    _getErrorPattern() {
        const {errorPatterns, error} = this.props;

        return errorPatterns.find(({regexp}) => error.message.match(regexp));
    }

    _drawImage() {
        const {image, error} = this.props;

        if (!image.actualImg) {
            return null;
        }

        return isNoRefImageError(error)
            ? <Screenshot image={image.actualImg} />
            : <Details
                title="Page screenshot"
                content={() => <Screenshot image={image.actualImg} noLazyLoad={true} />}
                extendClassNames="details_type_image"
                onClick={this.onTogglePageScreenshot}
            />;
    }

    onTogglePageScreenshot = () => {
        this.props.actions.togglePageScreenshot();
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
                titleText = <span>show more</span>;
                content = isFunction(value) ? value : () => value;
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

    render() {
        const {error, errorDetails} = this.props;
        const errorPattern = this._getErrorPattern();

        const extendedError = isEmpty(errorPattern)
            ? error
            : {...error, message: `${errorPattern.name}\n${error.message}`, hint: () => parseHtmlString(errorPattern.hint)};

        return (
            <div className="image-box__image image-box__image_single">
                <div className="error">{this._errorToElements(extendedError)}</div>
                {errorDetails && <ErrorDetails errorDetails={errorDetails} />}
                {this._drawImage()}
            </div>
        );
    }
}

export default connect(
    ({config: {errorPatterns}}, {result, image}) => {
        const error = image.error || result.error;
        const errorDetails = image.stateName ? null : result.errorDetails;

        return {error, errorDetails, errorPatterns};
    },
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(StateError);

function parseHtmlString(str = '') {
    const html = str ? ReactHtmlParser(str) : null;

    return Array.isArray(html) && html.length === 1 ? html[0] : html;
}

function splitBySpace(str) {
    const spaceIndex = str.slice(0, ERROR_TITLE_TEXT_LENGTH).lastIndexOf(' ');
    const breakIndex = spaceIndex === -1 ? ERROR_TITLE_TEXT_LENGTH : spaceIndex;

    return [str.slice(0, breakIndex), str.slice(breakIndex + 1)];
}
