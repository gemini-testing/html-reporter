'use strict';

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {map} from 'lodash';
import Screenshot from './screenshot';

export default class StateError extends Component {
    static propTypes = {
        image: PropTypes.bool.isRequired,
        error: PropTypes.object.isRequired,
        actualImg: PropTypes.object
    };

    render() {
        const {image, error, actualImg} = this.props;

        return (
            <div className="image-box__image">
                <div className="error">{errorToElements(error)}</div>
                {this._drawImage(image, actualImg)}
            </div>
        );
    }

    _drawImage(image, actualImg) {
        return image ? <Screenshot image={actualImg}/> : null;
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
