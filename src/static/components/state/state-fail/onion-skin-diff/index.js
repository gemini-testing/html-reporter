import React, {Component} from 'react';
import FullScreenshot from '../../screenshot/full';
import withSyncedScale from '../../screenshot/with-synced-scale';
import {imageType, syncedImageType} from '../prop-types';

import './index.styl';

const DEFAULT_IMAGE_TRANSPARENCY = 0.5;

class OnionSkinDiff extends Component {
    static propTypes = {
        image1: imageType.isRequired,
        image2: imageType.isRequired,
        // from withSyncedScale
        syncedImage1: syncedImageType.isRequired,
        syncedImage2: syncedImageType.isRequired
    }

    state = {imgTransparency: DEFAULT_IMAGE_TRANSPARENCY}

    _handleChangeTransparency = (e) => {
        return this.setState({imgTransparency: parseFloat(e.target.value)});
    }

    render() {
        const {image1, image2, syncedImage1, syncedImage2} = this.props;
        const {imgTransparency} = this.state;

        return (
            <div className='onion-skin-diff'>
                <div className='onion-skin-diff__img-container'>
                    <FullScreenshot className='onion-skin-diff__img' image={image1} imgRef={syncedImage1.containerRef} style={{width: syncedImage1.width}} />
                    <FullScreenshot className='onion-skin-diff__img' image={image2} imgRef={syncedImage2.containerRef} style={{width: syncedImage2.width, opacity: imgTransparency}} />
                </div>
                <div className="onion-skin-diff__footer">
                    <input className='onion-skin-diff__slider' type="range" min={0} max={1} step={0.01} value={imgTransparency} onChange={this._handleChangeTransparency} />
                </div>
            </div>
        );
    }
}

export default withSyncedScale(OnionSkinDiff);
