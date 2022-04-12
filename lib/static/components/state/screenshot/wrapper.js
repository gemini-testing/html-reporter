import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {isUrl} from '../../../../common-utils';

export default (ScreenshotComponent) => class WrappedComponent extends Component {
    static propTypes = {
        noCache: PropTypes.bool,
        image: PropTypes.shape({
            path: PropTypes.string.isRequired
        }).isRequired
    }

    static defaultProps = {
        noCache: false
    }

    render() {
        const {noCache, image: {path: imgPath}} = this.props;

        const imageUrl = noCache
            ? addTimestamp(encodeUri(imgPath))
            : encodeUri(imgPath);

        return <ScreenshotComponent
            imageUrl={imageUrl}
            {...this.props}
        />;
    }
};

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
