'use strict';

import React, {Component, Fragment} from 'react';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import LazyLoad from '@gemini-testing/react-lazyload';
import Placeholder from './placeholder';
import DiffCircle from './diff-circle';

class Screenshot extends Component {
    constructor(props) {
        super(props);

        this.state = {
            showDiffCircle: false,
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
            })
        }).isRequired,
        diffClusters: PropTypes.array,
        lazyLoadOffset: PropTypes.number
    }

    static defaultProps = {
        noCache: false
    }

    _getScreenshotComponent(elem, diffClusters, placeholder = null) {
        const {lazyLoadOffset: offset} = this.props;

        const rawElem = <Fragment>
            {diffClusters && diffClusters.map((c, id) => <DiffCircle
                diffTarget={this.state.diffTarget}
                display={this.state.showDiffCircle}
                toggleDiff={this.toggleDiff}
                diffBounds={c}
                key={id}
            />)}
            {elem}
        </Fragment>;

        return offset
            ? <LazyLoad offset={offset} debounce={50} placeholder={placeholder} once>{rawElem}</LazyLoad>
            : rawElem;
    }

    toggleDiff = () => {
        this.setState({showDiffCircle: !this.state.showDiffCircle});
    }

    _handleDiffClick = () => ({target}) => {
        this.toggleDiff();
        this.setState({diffTarget: target});
    }

    render() {
        const {noCache, image: {path: imgPath, size: imgSize}, diffClusters} = this.props;
        const url = noCache
            ? addTimestamp(encodeUri(imgPath))
            : encodeUri(imgPath);

        if (!imgSize) {
            const elem = <img src={url} className="image-box__screenshot image-box__screenshot_auto-size" />;

            return this._getScreenshotComponent(elem, diffClusters);
        }

        const paddingTop = ((imgSize.height / imgSize.width) * 100).toFixed(2);
        const elem = <div onClick={diffClusters && this._handleDiffClick(diffClusters)} className="image-box__screenshot image-box__screenshot_fixed-size" style={{width: imgSize.width, paddingTop: `${paddingTop}%`, 'backgroundImage': `url(${url})`}} />;

        const placeholder = <Placeholder width={imgSize.width} paddingTop={`${paddingTop}%`} />;

        return this._getScreenshotComponent(elem, diffClusters, placeholder);
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
