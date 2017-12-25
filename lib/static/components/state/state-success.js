'use strict';

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import Screenshot from './screenshot';

export default class StateSuccess extends Component {
    static propTypes = {
        expected: PropTypes.string.isRequired
    }

    render() {
        return (
            <div className="image-box__image">
                <Screenshot imagePath={this.props.expected}/>
            </div>
        );
    }
}
