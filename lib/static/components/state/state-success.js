'use strict';

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import Screenshot from './screenshot';
import {isUpdatedStatus} from '../../../common-utils';

export default class StateSuccess extends Component {
    static propTypes = {
        status: PropTypes.string.isRequired,
        expectedImg: PropTypes.object.isRequired
    }

    render() {
        const {status, expectedImg} = this.props;

        return (
            <div className="image-box__image">
                <Screenshot noCache={isUpdatedStatus(status)} image={expectedImg}/>
            </div>
        );
    }
}
