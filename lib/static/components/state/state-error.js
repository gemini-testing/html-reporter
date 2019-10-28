'use strict';

import React, {Component, Fragment} from 'react';
import PropTypes from 'prop-types';
import {map} from 'lodash';
import Screenshot from './screenshot';
import {isNoRefImageError} from '../../modules/utils';
import ErrorDetails from './error-details';
import Details from '../details';

export default class StateError extends Component {
    static propTypes = {
        image: PropTypes.bool.isRequired,
        error: PropTypes.object.isRequired,
        actualImg: PropTypes.object
    };

    render() {
        const {image, error, errorDetails, actualImg} = this.props;

        return (
            <div className="image-box__image image-box__image_single">
                <div className="error">{this._errorToElements(error)}</div>
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
            const [titleText, ...content] = value.split('\n');
            const title = <Fragment><span className="error__item-key">{key}:</span> {titleText}</Fragment>;

            return <Details
                key={key}
                title={title}
                content={content.length > 0 ? content.join('\n') : ''}
                extendClassNames="error__item"
            />;
        });
    }
}
