import React, {Component} from 'react';
import PropTypes from 'prop-types';
import FullScreenshot from '../../screenshot/full';
import withSyncedScale from '../../screenshot/with-synced-scale';

import './index.styl';

const DEFAULT_IMAGE_TRANSPARENCY = 0.5;

class OnionSkinDiff extends Component {
    static propTypes = {
        image1: PropTypes.shape({
            path: PropTypes.string.isRequired,
            size: PropTypes.shape({
                width: PropTypes.number,
                height: PropTypes.number
            })
        }).isRequired,
        image2: PropTypes.shape({
            path: PropTypes.string.isRequired,
            size: PropTypes.shape({
                width: PropTypes.number,
                height: PropTypes.number
            })
        }).isRequired,
        // from withSyncedScale
        syncedImage1: PropTypes.shape({
            containerRef: PropTypes.shape({
                current: PropTypes.instanceOf(Element)
            }),
            paddingTop: PropTypes.string,
            width: PropTypes.number
        }).isRequired,
        syncedImage2: PropTypes.shape({
            containerRef: PropTypes.shape({
                current: PropTypes.instanceOf(Element)
            }),
            paddingTop: PropTypes.string,
            width: PropTypes.number
        }).isRequired,
        imagesContainerHeight: PropTypes.number.isRequired
    }

    state = {imgTransparency: DEFAULT_IMAGE_TRANSPARENCY}

    _handleChangeTransparency = (e) => {
        return this.setState({imgTransparency: parseFloat(e.target.value)});
    }

    render() {
        const {image1, image2, syncedImage1, syncedImage2, imagesContainerHeight} = this.props;
        const {imgTransparency} = this.state;

        return (
            <div className='onion-skin-diff'>
                <div className='onion-skin-diff__images-container' style={{height: imagesContainerHeight}}>
                    <div className='onion-skin-diff__img-container' ref={syncedImage1.containerRef}>
                        <div style={{width: syncedImage1.width, paddingTop: `${syncedImage1.paddingTop}%`}}>
                            <FullScreenshot className='onion-skin-diff__img' image={image1} />
                        </div>
                    </div>
                    <div className='onion-skin-diff__img-container' ref={syncedImage2.containerRef}>
                        <div style={{width: syncedImage2.width, paddingTop: `${syncedImage2.paddingTop}%`}}>
                            <FullScreenshot className='onion-skin-diff__img' image={image2} style={{opacity: imgTransparency}} />
                        </div>
                    </div>
                </div>
                <div className="onion-skin-diff__footer">
                    <input className='onion-skin-diff__slider' type="range" min={0} max={1} step={0.01} value={imgTransparency} onChange={this._handleChangeTransparency} />
                </div>
            </div>
        );
    }
}

export default withSyncedScale(OnionSkinDiff);

/*
return (
    <div className='onion-skin-diff'>
        <div className='onion-skin-diff__images-container' style={{height: imagesContainerHeight}}>
            <div className='onion-skin-diff__img-container' ref={syncedImage1.containerRef}>
                <div style={{width: syncedImage1.width, paddingTop: `${syncedImage1.paddingTop}%`}}>
                    <FullScreenshot className='onion-skin-diff__img' image={image1} />
                </div>
            </div>
            <div className='onion-skin-diff__img-container' ref={syncedImage2.containerRef}>
                <div style={{width: syncedImage2.width, paddingTop: `${syncedImage2.paddingTop}%`}}>
                    <FullScreenshot className='onion-skin-diff__img' image={image2} style={{opacity: imgTransparency}} />
                </div>
            </div>
        </div>
        <div className="onion-skin-diff__footer">
            <input className='onion-skin-diff__slider' type="range" min={0} max={1} step={0.01} value={imgTransparency} onChange={this._handleChangeTransparency} />
        </div>
    </div>
);
*/

/*
render() {
    const {image1, image2, syncedImage1, syncedImage2, imagesContainerHeight} = this.props;
    const {imgTransparency} = this.state;

    return (
        <div className='onion-skin-diff'>
            <div className='onion-skin-diff__images-container'>
                <FullScreenshot className='onion-skin-diff__img' image={image1} imgRef={syncedImage1.containerRef} />
                <FullScreenshot className='onion-skin-diff__img' image={image2} imgRef={syncedImage2.containerRef} style={{opacity: imgTransparency, width: syncedImage2.width}} />
            </div>
            <div className="onion-skin-diff__footer">
                <input className='onion-skin-diff__slider' type="range" min={0} max={1} step={0.01} value={imgTransparency} onChange={this._handleChangeTransparency} />
            </div>
        </div>
    );
}
*/
