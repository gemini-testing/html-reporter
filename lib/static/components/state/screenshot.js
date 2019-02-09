'use strict';

import React, {Component} from 'react';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import LazyLoad from '@gemini-testing/react-lazyload';
import Placeholder from './placeholder';
import DiffCircle from './diff-circle';

class Screenshot extends Component {
    constructor(props) {
        super(props);

        this.state = {
            showCircle: false,
            diffRect: {},
            diffTarget: {}
        };
    }

    static propTypes = {
        noCache: PropTypes.bool,
        image: PropTypes.shape({
            path: PropTypes.string.isRequired,
            size: PropTypes.shape({
                width: PropTypes.number,
                height: PropTypes.number
            }),
            diffBounds: PropTypes.shape({
                left: PropTypes.number,
                top: PropTypes.number,
                right: PropTypes.number,
                bottom: PropTypes.number
            })
        }).isRequired,
        lazyLoadOffset: PropTypes.number
    }

    static defaultProps = {
        noCache: false
    }

    _getScreenshotComponent(elem, diffBounds, placeholder = null) {
        const {lazyLoadOffset: offset} = this.props;
        const newElem = <div>
            <DiffCircle
                diffTarget={this.state.diffTarget}
                display={this.state.showCircle}
                toggleDiff={this.toggleDiff}
                diffBounds={diffBounds}
            />
            {elem}
        </div>;

        return offset
            ? <LazyLoad offset={offset} debounce={50} placeholder={placeholder} once>{newElem}</LazyLoad>
            : newElem;
    }

    toggleDiff = (showCircle) => {
        this.setState({showCircle});
    }

    _handle = () => ({target}) => {
        this.toggleDiff(true);
        this.setState({diffTarget: target});
    }

    render() {
        const {noCache, image: {path: imgPath, size: imgSize, diffBounds}} = this.props;

        const url = noCache
            ? addTimestamp(encodeUri(imgPath))
            : encodeUri(imgPath);

        if (!imgSize) {
            const elem = <img src={url} className="image-box__screenshot image-box__screenshot_auto-size" />;

            return this._getScreenshotComponent(elem, diffBounds);
        }

        const paddingTop = ((imgSize.height / imgSize.width) * 100).toFixed(2);
        const elem = <div onClick={diffBounds && this._handle(diffBounds)} className="image-box__screenshot image-box__screenshot_fixed-size" style={{width: imgSize.width, paddingTop: `${paddingTop}%`, 'backgroundImage': `url(${url})`}} />;

        const placeholder = <Placeholder width={imgSize.width} paddingTop={`${paddingTop}%`} />;

        return this._getScreenshotComponent(elem, diffBounds, placeholder);
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
