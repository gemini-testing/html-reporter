'use strict';

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import ScreenshotWrapper from './wrapper';

class FullScreenshot extends Component {
    static propTypes = {
        noCache: PropTypes.bool,
        image: PropTypes.shape({
            path: PropTypes.string.isRequired,
            size: PropTypes.shape({
                width: PropTypes.number,
                height: PropTypes.number
            })
        }).isRequired,
        // from ScreenshotWrapper
        imageUrl: PropTypes.string.isRequired
    }

    render() {
        const {imageUrl, className, style} = this.props;

        return <img className={className} src={imageUrl} style={style} />;
    }
}

export default ScreenshotWrapper(FullScreenshot);
