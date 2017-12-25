'use strict';

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import Screenshot from './screenshot';

export default class StateError extends Component {
    static propTypes = {
        actual: PropTypes.string.isRequired,
        image: PropTypes.bool.isRequired,
        reason: PropTypes.string.isRequired
    };

    render() {
        const {image, reason, actual} = this.props;

        return (
            <div className="image-box__image">
                <pre className="reason">{reason}</pre>
                {this._drawImage(image, actual)}
            </div>
        );
    }

    _drawImage(image, actual) {
        return image ? <Screenshot imagePath={actual}/> : null;
    }
}
