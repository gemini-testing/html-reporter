'use strict';

import React, {Component} from 'react';
import {connect} from 'react-redux';
import LazyLoad from 'react-lazyload';

interface IScreenshot{
    noCache?: boolean;
    imagePath: string;
    lazyLoadOffset?: number;
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
        return lazyLoadOffset ? (<LazyLoad offset={lazyLoadOffset}>{elem}</LazyLoad>) : elem;

    }
}

export default connect(({view: {lazyLoadOffset}}: {view: IScreenshot}) => ({lazyLoadOffset}))(Screenshot);

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
