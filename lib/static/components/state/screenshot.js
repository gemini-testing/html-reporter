'use strict';

import React, {Component} from 'react';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import LazyLoad from '@gemini-testing/react-lazyload';
import Placeholder from './placeholder';

class Screenshot extends Component {
    static propTypes = {
        noCache: PropTypes.bool,
        image: PropTypes.shape({
            path: PropTypes.string.isRequired,
            size: PropTypes.shape({
                width: PropTypes.number,
                height: PropTypes.number
            })
        }).isRequired,
        lazyLoadOffset: PropTypes.number
    }

    static defaultProps = {
        noCache: false
    }

    render() {
        const {noCache, image: {path: imgPath, size: imgSize}, lazyLoadOffset: offset} = this.props;

        const url = noCache
            ? addTimestamp(encodeUri(imgPath))
            : encodeUri(imgPath);

        if (!imgSize) {
            const elem = <img src={url} className="image-box__screenshot" />;

            return offset ? <LazyLoad offsetVertical={offset} once>{elem}</LazyLoad> : elem;
        }

        const elem = <img src={url} width={imgSize.width} height={imgSize.height} className="image-box__screenshot" />;

        const paddingTop = ((imgSize.height / imgSize.width) * 100).toFixed(2);
        const placeholder = <Placeholder width={imgSize.width} paddingTop={`${paddingTop}%`} />;

        return <LazyLoad offsetVertical={offset} debounce={50} placeholder={placeholder} once>{elem}</LazyLoad>;
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

export default connect(({view: {lazyLoadOffset}}) => ({lazyLoadOffset}))(Screenshot);
