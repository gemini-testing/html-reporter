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
        lazyLoadOffset: PropTypes.number,
        noLazyLoad: PropTypes.bool
    }

    static defaultProps = {
        noCache: false,
        noLazyLoad: false
    }

    _getScreenshotComponent(elem, diffClusters, placeholder = null) {
        const {lazyLoadOffset: offset, noLazyLoad} = this.props;

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

        return offset && !noLazyLoad
            ? <LazyLoad offset={offset} debounce={50} placeholder={placeholder} once>{rawElem}</LazyLoad>
            : rawElem;
    }

    toggleDiff = () => {
        this.setState({showDiffCircle: !this.state.showDiffCircle});
    }

    _handleDiffClick = () => ({target}) => {
        this.toggleDiff();
        this.setState({diffTarget: target.parentElement});
    }

    render() {
        const {noCache, image: {path: imgPath, size: imgSize}, diffClusters} = this.props;
        const url = noCache
            ? addTimestamp(encodeUri(imgPath))
            : encodeUri(imgPath);

        if (!imgSize) {
            const elem = <div className="image-box__screenshot-container image-box__screenshot-container_auto-size"><img src={url} style={{width: '100%', height: '100%'}}/></div>;

            return this._getScreenshotComponent(elem, diffClusters);
        }

        const paddingTop = ((imgSize.height / imgSize.width) * 100).toFixed(2);
        const elem = <div onClick={diffClusters && this._handleDiffClick(diffClusters)} className="image-box__screenshot-container image-box__screenshot-container_fixed-size" style={{width: imgSize.width, paddingTop: `${paddingTop}%`}}><img src={url} className="image-box__screenshot"/></div>;

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
