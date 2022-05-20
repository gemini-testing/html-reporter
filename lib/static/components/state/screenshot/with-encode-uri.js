import React from 'react';
import PropTypes from 'prop-types';
import {isUrl} from '../../../../common-utils';

// for prevent image caching
function addTimestamp(imagePath) {
    return `${imagePath}?t=${Date.now()}`;
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

function withEncodeUri(ScreenshotComponent) {
    return function wrapper(props) {
        const {noCache, image: {path: imgPath}} = props;

        const imageUrl = noCache
            ? addTimestamp(encodeUri(imgPath))
            : encodeUri(imgPath);

        return <ScreenshotComponent
            imageUrl={imageUrl}
            {...props}
        />;
    };
}

withEncodeUri.propTypes = {
    noCache: PropTypes.bool,
    image: PropTypes.shape({
        path: PropTypes.string.isRequired
    }).isRequired
};

export default withEncodeUri;
