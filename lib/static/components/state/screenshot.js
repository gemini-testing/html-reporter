'use strict';

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import LazyLoad from 'react-lazy-load';

export default class Screenshot extends Component {
    static propTypes = {
        noCache: PropTypes.bool,
        imagePath: PropTypes.string.isRequired
    }

    static defaultProps = {
        noCache: false
    }

    render() {
        const {noCache, imagePath} = this.props;

        const url = noCache
            ? addTimestamp(encodeUri(imagePath))
            : encodeUri(imagePath);

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

function encodeUri(imagePath) {
    return imagePath
        .split('/')
        .map((item) => encodeURIComponent(item))
        .join('/');
}

// for prevent image caching
function addTimestamp(imagePath) {
    return `${imagePath}?t=${Date.now()}`;
}
