'use strict';

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {map} from 'lodash';
import Screenshot from './screenshot';
import ToggleOpen from '../toggle-open';
import {isNoRefImageError} from '../../modules/utils';

export default class StateError extends Component {
    static propTypes = {
        image: PropTypes.bool.isRequired,
        error: PropTypes.object.isRequired,
        actualImg: PropTypes.object
    };

    render() {
        const {image, error, actualImg} = this.props;

        return (
            <div className="image-box__image image-box__image_single">
                <div className="error">{errorToElements(error)}</div>
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
            : <ToggleOpen title="Page screenshot" content={<Screenshot image={actualImg} noLazyLoad={true} />} />;
    }
}

function errorToElements(error) {
    return map(error, (value, key) => {
        return (
            <div key={key} className="error__item">
                <span className="error__item-key">{key}</span>: {value}
            </div>
        );
    });
}
