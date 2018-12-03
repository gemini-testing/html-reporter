'use strict';

import React, {Component} from 'react';
import {connect} from 'react-redux';
const LazyLoad = require('react-lazy-load');

interface IScreenshot{
    noCache?: boolean;
    imagePath: string;
    lazyLoadOffset: number;
}
class Screenshot extends Component<IScreenshot> {

    static defaultProps = {
        noCache: false
    };

    render() {
        const {noCache, imagePath, lazyLoadOffset} = this.props;

        const url = noCache
            ? addTimestamp(encodeUri(imagePath))
            : encodeUri(imagePath);

        const elem = <img src={url} className='image-box__screenshot' />;

        return lazyLoadOffset ? <LazyLoad offsetVertical={lazyLoadOffset}>{elem}</LazyLoad> : elem;
    }
}

export default connect(({view: {lazyLoadOffset}}: any) => ({lazyLoadOffset}))(Screenshot);

function encodeUri(imagePath: string) {
    return imagePath
        .split('/')
        .map((item) => encodeURIComponent(item))
        .join('/');
}

// for prevent image caching
function addTimestamp(imagePath: string) {
    return `${imagePath}?t=${Date.now()}`;
}
