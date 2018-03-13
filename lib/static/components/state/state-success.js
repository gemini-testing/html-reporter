'use strict';

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import Screenshot from './screenshot';

export default class StateSuccess extends Component {
    static propTypes = {
        expected: PropTypes.string
    }

    render() {
        return (this._drawImage(this.props.expected));
    }

    _drawImage(expected) {
        if (!expected) {
            return (null);
        }
        return (
            <div className="image-box__image">
                <Screenshot imagePath={expected}/>
            </div>
        );
    }
}
