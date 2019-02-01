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

    _getScreenshotComponent(elem, placeholder = null) {
        const {lazyLoadOffset: offset} = this.props;

        return offset
            ? <LazyLoad offset={offset} debounce={50} placeholder={placeholder} once>{elem}</LazyLoad>
            : elem;
    }

    render() {
        const {noCache, image: {path: imgPath, size: imgSize}} = this.props;

        const url = noCache
            ? addTimestamp(encodeUri(imgPath))
            : encodeUri(imgPath);

        if (!imgSize) {
            const elem = <img src={url} className="image-box__screenshot image-box__screenshot_auto-size" />;

            return this._getScreenshotComponent(elem);
        }

        const paddingTop = ((imgSize.height / imgSize.width) * 100).toFixed(2);
        const elem = <div className="image-box__screenshot image-box__screenshot_fixed-size" style={{width: imgSize.width, paddingTop: `${paddingTop}%`, 'backgroundImage': `url(${url})`}} />;

        const placeholder = <Placeholder width={imgSize.width} paddingTop={`${paddingTop}%`} />;

        return this._getScreenshotComponent(elem, placeholder);
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
