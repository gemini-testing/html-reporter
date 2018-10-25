'use strict';

import React, {Component} from 'react';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import LazyLoad from 'react-lazy-load';

class Screenshot extends Component {
    static propTypes = {
        noCache: PropTypes.bool,
        imagePath: PropTypes.string.isRequired,
        lazyLoadOffset: PropTypes.number
    }

    static defaultProps = {
        noCache: false
    }

    render() {
        const {noCache, imagePath, lazyLoadOffset} = this.props;

        const url = noCache
            ? addTimestamp(encodeUri(imagePath))
            : encodeUri(imagePath);

        const elem = <img src={url} className="image-box__screenshot" />;

        return lazyLoadOffset ? <LazyLoad offsetVertical={lazyLoadOffset}>{elem}</LazyLoad> : elem;
    }
}

export default connect(({view: {lazyLoadOffset}}) => ({lazyLoadOffset}))(Screenshot);

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
