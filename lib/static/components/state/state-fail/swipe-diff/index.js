import React, {Component} from 'react';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import FullScreenshot from '../../screenshot/full';
import ArrowsMove from '../../../icons/arrows-move';
import withSyncedScale from '../../screenshot/with-synced-scale';

import './index.styl';

function clamp(n, min = 0, max = 100) {
    return Math.max(Math.min(n, max), min);
}

class SwipeDiff extends Component {
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
        imagesContainerHeight: PropTypes.number.isRequired,
        getRenderedImgWidth: PropTypes.func.isRequired
    }

    constructor(props) {
        super(props);

        this._swipeContainer = React.createRef();
        this._swipeContainerLeft = 0;

        this.state = {
            mousePosX: this._getMiddleMousePosX(),
            isPressed: false
        };
    }

    componentDidMount() {
        this._swipeContainerLeft = this._swipeContainer.current.getBoundingClientRect().left;

        this.setState({mousePosX: this._getMiddleMousePosX()});
    }

    _getMiddleMousePosX() {
        const {image1, syncedImage1, syncedImage2, getRenderedImgWidth} = this.props;
        const middlePosX = Math.min(getRenderedImgWidth(syncedImage1), getRenderedImgWidth(syncedImage2)) / 2;
        console.log('middlePosX:', middlePosX);

        return clamp(middlePosX, 0, image1.size.width);
    }

    _getMousePosX(e) {
        const newMousePosX = e.pageX - this._swipeContainerLeft - window.scrollX;
        return clamp(newMousePosX, 0, this.props.syncedImage1.width);
    }

    _calcImgPosX(width) {
        const imgPosX = this.state.mousePosX / width * 100;
        return clamp(imgPosX, 0, 100);
    }

    _handleMouseMove = (e) => {
        if (!this.state.isPressed) {
            return;
        }

        this.setState({mousePosX: this._getMousePosX(e)});
    }

    _handleMouseDown = (e) => {
        this.setState({mousePosX: this._getMousePosX(e), isPressed: true});

        window.addEventListener('mousemove', this._handleMouseMove);
        window.addEventListener('mouseup', this._handleMouseUp);
    }

    _handleMouseUp = () => {
        this.setState({isPressed: false});

        window.removeEventListener('mouseup', this._handleMouseUp);
        window.removeEventListener('mousemove', this._handleMouseMove);
    }

    render() {
        const {image1, image2, syncedImage1, syncedImage2, imagesContainerHeight, getRenderedImgWidth} = this.props;
        const {isPressed} = this.state;

        // console.log('syncedImage1.width:', syncedImage1.width);
        // console.log('syncedImage1.containerRef:', syncedImage1.containerRef.current && syncedImage1.containerRef.current.getBoundingClientRect().width);
        // console.log('syncedImage1.paddingTop:', syncedImage1.paddingTop);
        // console.log('!!! getRenderedImgWidth(image2, syncedImage2):', getRenderedImgWidth(image2, syncedImage2));
        const img1PosX = 100 - this._calcImgPosX(getRenderedImgWidth(syncedImage1));
        const img2PosX = this._calcImgPosX(getRenderedImgWidth(syncedImage2));

        console.log('getRenderedImgWidth(syncedImage1):', getRenderedImgWidth(syncedImage1));
        console.log('getRenderedImgWidth(syncedImage2):', getRenderedImgWidth(syncedImage2));

        console.log('img1PosX:', img1PosX);
        console.log('img2PosX:', img2PosX);

        const className = classNames(
            'swipe-diff',
            {'swipe-diff_pressed': isPressed}
        );

        // console.log('syncedImage1:', syncedImage1);
        // console.log('syncedImage2:', syncedImage2);
        console.log('imagesContainerHeight:', imagesContainerHeight);
        // style={{width: this._maxWidth, height: this._maxHeight, '--img1-pos-x': `${img1PosX}%`, '--img2-pos-x': `${img2PosX}%`}}

        return (
            <div
                className={className}
                style={{height: imagesContainerHeight, '--img1-pos-x': `${img1PosX}%`, '--img2-pos-x': `${img2PosX}%`}}
                ref={this._swipeContainer}
                onMouseDown={this._handleMouseDown}
            >
                <div className="swipe-diff__first">
                    <div className="swipe-diff__overlay">
                        <div className="swipe-diff__frame" ref={syncedImage1.containerRef}>
                            <div style={{width: syncedImage1.width, paddingTop: `${syncedImage1.paddingTop}%`}}>
                                <FullScreenshot className='swipe-diff__img' image={image1} />
                            </div>
                        </div>
                    </div>
                    <div className="swipe-diff-divider" style={{height: imagesContainerHeight}}>
                        <div className="swipe-diff-divider__line"></div>
                        <div className="swipe-diff-divider__arrows">
                            <ArrowsMove />
                        </div>
                    </div>
                </div>
                <div className='swipe-diff__second'>
                    <div className="swipe-diff__frame" ref={syncedImage2.containerRef}>
                        <div style={{width: syncedImage2.width, paddingTop: `${syncedImage2.paddingTop}%`}}>
                            <FullScreenshot className='swipe-diff__img' image={image2} />
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

export default withSyncedScale(SwipeDiff);

// return (
//     <div
//         className={className}
//         style={{height: imagesContainerHeight, '--img1-pos-x': `${img1PosX}%`, '--img2-pos-x': `${img2PosX}%`}}
//         ref={this._swipeContainer}
//         onMouseDown={this._handleMouseDown}
//     >
//         <div className="swipe-diff__first">
//             <div className="swipe-diff__overlay">
//                 <div className="swipe-diff__frame" ref={syncedImage1.containerRef}>
//                     <div style={{width: syncedImage1.width, paddingTop: `${syncedImage1.paddingTop}%`}}>
//                         <FullScreenshot className='swipe-diff__img' image={image1} />
//                     </div>
//                 </div>
//             </div>
//             <div className="swipe-diff-divider" style={{height: this._maxHeight}}>
//                 <div className="swipe-diff-divider__line"></div>
//                 <div className="swipe-diff-divider__arrows">
//                     <ArrowsMove />
//                 </div>
//             </div>
//         </div>
//         <div className='swipe-diff__second' style={{width: image2.size.width}}>
//             <div className="swipe-diff__frame" ref={syncedImage2.containerRef}>
//                 <FullScreenshot className='swipe-diff__img' image={image2} style={{height: image2.size.height}} />
//             </div>
//         </div>
//     </div>
// );
