'use strict';

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import Screenshot from './screenshot';
import {isUpdatedStatus} from '../../../common-utils';

export default class StateSuccess extends Component {
    static propTypes = {
        status: PropTypes.string.isRequired,
        expected: PropTypes.string.isRequired
    }

    render() {
        const imagePath = isUpdatedStatus(this.props.status)
            ? addTimestamp(this.props.expected)
            : this.props.expected;

        return (
            <div className="image-box__image">
                <Screenshot imagePath={imagePath}/>
            </div>
        );
    }
}

// for prevent image caching
function addTimestamp(imagePath) {
    return imagePath.concat(`?t=${Date.now()}`);
}
