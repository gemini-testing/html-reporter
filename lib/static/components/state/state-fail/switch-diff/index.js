import React, {Component} from 'react';
import FullScreenshot from '../../screenshot/full';
import withSyncedScale from '../../screenshot/with-synced-scale';
import {imageType, syncedImageType} from '../prop-types';

import './index.styl';

class SwitchDiff extends Component {
    static propTypes = {
        image1: imageType.isRequired,
        image2: imageType.isRequired,
        // from withSyncedScale
        syncedImage1: syncedImageType.isRequired,
        syncedImage2: syncedImageType.isRequired
    }

    state = {showFirst: true}

    _handleClick = () => this.setState({showFirst: !this.state.showFirst})

    render() {
        const {image1, image2, syncedImage1, syncedImage2} = this.props;
        const {showFirst} = this.state;
        const displayImage1 = showFirst ? 'visible' : 'hidden';
        const displayImage2 = !showFirst ? 'visible' : 'hidden';

        return (
            <div className={'switch-diff'} onClick={this._handleClick} >
                <FullScreenshot className='switch-diff__img' image={image1} imgRef={syncedImage1.containerRef} style={{width: syncedImage1.width, visibility: displayImage1}} />
                <FullScreenshot className='switch-diff__img' image={image2} imgRef={syncedImage2.containerRef} style={{width: syncedImage2.width, visibility: displayImage2}} />
            </div>
        );
    }
}

export default withSyncedScale(SwitchDiff);
