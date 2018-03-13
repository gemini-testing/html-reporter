'use strict';

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {map} from 'lodash';
import Screenshot from './screenshot';

export default class StateError extends Component {
    static propTypes = {
        actual: PropTypes.string,
        reason: PropTypes.object.isRequired
    };

    render() {
        const {reason, actual} = this.props;

        return (
            <div className="image-box__image">
                <div className="reason">{reasonToElements(reason)}</div>
                {this._drawImage(actual)}
            </div>
        );
    }

    _drawImage(actual) {
        return actual ? <Screenshot imagePath={actual}/> : null;
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
