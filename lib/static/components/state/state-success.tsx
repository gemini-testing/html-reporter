'use strict';

import React, {Component} from 'react';
import Screenshot from './screenshot';
import {isUpdatedStatus} from '../../../common-utils';

interface IStateSuccess {
    status: string;
    expected: string;

}

export default class StateSuccess extends Component<IStateSuccess> {

    render() {
        const {status, expected} = this.props;

        return (
            <div className='image-box__image'>
                <Screenshot noCache={isUpdatedStatus(status)} imagePath={expected}/>
            </div>
        );
    }
}
