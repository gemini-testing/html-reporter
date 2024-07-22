'use strict';

import React, {Component, Fragment} from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import DiffCircle from './diff-circle';
import withEncodeUri from './with-encode-uri';

class ResizedScreenshot extends Component {
    constructor(props) {
        super(props);

        this.state = {
            showDiffCircle: false,
            diffTarget: {}
        };
    }

    static propTypes = {
        style: PropTypes.object,
        image: PropTypes.shape({
            path: PropTypes.string.isRequired,
            size: PropTypes.shape({
                width: PropTypes.number,
                height: PropTypes.number
            })
        }).isRequired,
        diffClusters: PropTypes.array,
        overrideWidth: PropTypes.number,
        // from withEncodeUri
        imageUrl: PropTypes.string.isRequired,
        className: PropTypes.string
    };

    _getScreenshotComponent(elem, diffClusters) {
        return <Fragment>
            {diffClusters && diffClusters.map((c, id) => <DiffCircle
                originalImageWidth={this.props.image.size.width}
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
    };

    _handleDiffClick = () => ({target}) => {
        this.toggleDiff();
        this.setState({diffTarget: target.parentElement});
    };

    render() {
        const {imageUrl, image: {size: imgSize}, diffClusters, overrideWidth, style} = this.props;
        const cursorStyle = diffClusters ? {cursor: 'pointer'} : {};

        if (!imgSize) {
            const elem = (
                <div className="image-box__screenshot-container image-box__screenshot-container_auto-size">
                    <img src={imageUrl} style={{width: '100%', height: '100%', style, ...cursorStyle}}/>
                </div>
            );

            return this._getScreenshotComponent(elem, diffClusters);
        }

        const imgClassNames = classNames(
            'image-box__screenshot',
            this.props.className
        );

        const paddingTop = ((imgSize.height / imgSize.width) * 100).toFixed(2);
        const elem = (
            <div
                onClick={diffClusters && this._handleDiffClick(diffClusters)}
                className="image-box__screenshot-container image-box__screenshot-container_fixed-size"
                style={{width: overrideWidth || imgSize.width, paddingTop: `${paddingTop}%`}}
            >
                <img src={imageUrl} className={imgClassNames} style={{...style, ...cursorStyle}} />
            </div>
        );

        return this._getScreenshotComponent(elem, diffClusters);
    }
}

export default withEncodeUri(ResizedScreenshot);
