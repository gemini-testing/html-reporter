'use strict';

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import LazyLoad from 'react-lazy-load';

export default class Screenshot extends Component {
    static propTypes = {
        imagePath: PropTypes.string.isRequired
    }

    render() {
        const url = this.props.imagePath
            .split('/')
            .map((item) => encodeURIComponent(item))
            .join('/');

        return (
            <LazyLoad offsetVertical={800}>
                <img
                    src={url}
                    className="image-box__screenshot"
                />
            </LazyLoad>
        );
    }
}
