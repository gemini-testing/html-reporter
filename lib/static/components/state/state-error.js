'use strict';

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {map} from 'lodash';
import Screenshot from './screenshot';

export default class StateError extends Component {
    static propTypes = {
        actual: PropTypes.string.isRequired,
        image: PropTypes.bool.isRequired,
        reason: PropTypes.object.isRequired
    };

    render() {
        const {image, reason, actual} = this.props;

        return (
            <div className="image-box__image">
                <div className="reason">{reasonToElements(reason)}</div>
                {this._drawImage(image, actual)}
            </div>
        );
    }

    _drawImage(image, path) {
        return image ? <Screenshot imagePath={path}/> : null;
    }
}

function reasonToElements(reason) {
    if (typeof reason === 'string') {
        return <div className="reason__item">{reason}</div>;
    }

    return map(reason, (value, key) => {
        return (
            <div key={key} className="reason__item">
                <span className="reason__item-key">{key}</span>: {value}
            </div>
        );
    });
}
