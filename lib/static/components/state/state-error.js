'use strict';

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {map} from 'lodash';
import Screenshot from './screenshot';

export default class StateError extends Component {
    static propTypes = {
        image: PropTypes.bool.isRequired,
        reason: PropTypes.object.isRequired,
        actualImg: PropTypes.object
    };

    render() {
        const {image, reason, actualImg} = this.props;

        return (
            <div className="image-box__image">
                <div className="reason">{reasonToElements(reason)}</div>
                {this._drawImage(image, actualImg)}
            </div>
        );
    }

    _drawImage(image, actualImg) {
        return image ? <Screenshot image={actualImg}/> : null;
    }
}

function reasonToElements(reason) {
    return map(reason, (value, key) => {
        return (
            <div key={key} className="reason__item">
                <span className="reason__item-key">{key}</span>: {value}
            </div>
        );
    });
}
