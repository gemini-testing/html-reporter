'use strict';

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import Screenshot from './screenshot';

export default class StateSuccess extends Component {
    static propTypes = {
        expected: PropTypes.string.isRequired,
        image: PropTypes.bool.isRequired
    };

    render() {
        const {expected, image} = this.props;

        return (
            <div className="image-box__image">
                {this._drawImage(image, expected)}
            </div>
        );
    }

    _drawImage(image, path) {
        return image ? <Screenshot imagePath={path}/> : null;
    }
}
