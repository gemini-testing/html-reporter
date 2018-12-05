'use strict';

import React, {Component} from 'react';
import {map} from 'lodash';
import Screenshot from './screenshot';

interface IStateError {
    image: boolean;
    reason: any;
    actual: string;
}

export default class StateError extends Component<IStateError> {

    render() {
        const {image, reason, actual} = this.props;

        return (
            <div className='image-box__image'>
                <div className='reason'>{reasonToElements(reason)}</div>
                {this._drawImage(image, actual)}
            </div>
        );
    }

    _drawImage(image: boolean, actual: string) {
        return image ? <Screenshot imagePath={actual}/> : null;
    }
}

function reasonToElements(reason: any) {
    return map(reason, (value, key) => {
        return (
            <div key={key} className='reason__item'>
                <span className='reason__item-key'>{key}</span>: {value}
            </div>
        );
    });
}
