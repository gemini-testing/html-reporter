'use strict';

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import withEncodeUri from './with-encode-uri';

class FullScreenshot extends Component {
    static propTypes = {
        imgRef: PropTypes.shape({
            current: PropTypes.instanceOf(Element)
        }),
        style: PropTypes.shape({
            width: PropTypes.number,
            opacity: PropTypes.number,
            visibility: PropTypes.string
        }),
        // from withEncodeUri
        imageUrl: PropTypes.string.isRequired
    }

    render() {
        const {imageUrl, className, imgRef, style} = this.props;

        return <img className={className} src={imageUrl} ref={imgRef} style={style} />;
    }
}

export default withEncodeUri(FullScreenshot);
