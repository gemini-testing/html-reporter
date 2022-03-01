'use strict';

import React, {Component, Fragment} from 'react';
import PropTypes from 'prop-types';
import DiffCircle from './diff-circle';
import {isUrl} from '../../../common-utils';

export default class Screenshot extends Component {
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
        diffClusters: PropTypes.array
    }

    static defaultProps = {
        noCache: false
    }

    _getScreenshotComponent(elem, diffClusters) {
        return <Fragment>
            {diffClusters && diffClusters.map((c, id) => <DiffCircle
                diffTarget={this.state.diffTarget}
                display={this.state.showDiffCircle}
                toggleDiff={this.toggleDiff}
                diffBounds={c}
                key={id}
            />)}
            {elem}
        </Fragment>;
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

        return this._getScreenshotComponent(elem, diffClusters);
    }
}

function encodeUri(imagePath) {
    if (isUrl(imagePath)) {
        return imagePath;
    }

    return imagePath
        // we can't use path.sep here because on Windows browser returns '/' instead of '\\'
        .split(/\/|\\/)
        .map((item) => encodeURIComponent(item))
        .join('/');
}

// for prevent image caching
function addTimestamp(imagePath) {
    return `${imagePath}?t=${Date.now()}`;
}
