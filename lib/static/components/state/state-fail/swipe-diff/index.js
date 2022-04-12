import React, {Component} from 'react';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import FullScreenshot from '../../screenshot/full';
import ArrowsMove from '../../../icons/arrows-move';
import withSyncedScale from '../../screenshot/with-synced-scale';
import {imageType, syncedImageType} from '../prop-types';

import './index.styl';

function clamp(n, min = 0, max = 100) {
    return Math.max(Math.min(n, max), min);
}

class SwipeDiff extends Component {
    static propTypes = {
        image1: imageType.isRequired,
        image2: imageType.isRequired,
        // from withSyncedScale
        syncedImage1: syncedImageType.isRequired,
        syncedImage2: syncedImageType.isRequired,
        resizesNum: PropTypes.number.isRequired,
        getRenderedImgWidth: PropTypes.func.isRequired
    }

    constructor(props) {
        super(props);

        this._swipeContainer = React.createRef();
        this._swipeContainerLeft = 0;

        this.state = {
            mousePosX: 0,
            isPressed: false,
            dividerWasMoved: false
        };
    }

    componentDidMount() {
        this._swipeContainerLeft = this._swipeContainer.current.getBoundingClientRect().left;

        this.setState({mousePosX: this._getMiddleMousePosX()});
    }

    componentDidUpdate(prevProps) {
        if (this.state.dividerWasMoved || prevProps.resizesNum === this.props.resizesNum) {
            return;
        }

        this.setState({mousePosX: this._getMiddleMousePosX()});
    }

    _getMiddleMousePosX() {
        const {image1, syncedImage1, syncedImage2, getRenderedImgWidth} = this.props;
        const middlePosX = Math.min(getRenderedImgWidth(syncedImage1), getRenderedImgWidth(syncedImage2)) / 2;

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
        this.setState({mousePosX: this._getMousePosX(e), isPressed: true, dividerWasMoved: true});

        window.addEventListener('mousemove', this._handleMouseMove);
        window.addEventListener('mouseup', this._handleMouseUp);

        document.body.classList.add('disable-user-select');
    }

    _handleMouseUp = () => {
        this.setState({isPressed: false});
        document.body.classList.remove('disable-user-select');

        window.removeEventListener('mouseup', this._handleMouseUp);
        window.removeEventListener('mousemove', this._handleMouseMove);
    }

    render() {
        const {image1, image2, syncedImage1, syncedImage2, getRenderedImgWidth} = this.props;
        const {isPressed} = this.state;

        const maxRenderedWidth = Math.max(getRenderedImgWidth(syncedImage1), getRenderedImgWidth(syncedImage2));
        const img1PosX = 100 - this._calcImgPosX(maxRenderedWidth);
        const img2PosX = this._calcImgPosX(maxRenderedWidth);

        const className = classNames(
            'swipe-diff',
            {'swipe-diff_pressed': isPressed}
        );

        return (
            <div
                className={className}
                style={{'--img1-pos-x': `${img1PosX}%`, '--img2-pos-x': `${img2PosX}%`}}
                ref={this._swipeContainer}
                onMouseDown={this._handleMouseDown}
            >
                <div className='swipe-diff__second'>
                    <div className='swipe-diff__frame'>
                        <FullScreenshot className='swipe-diff__img' image={image2} imgRef={syncedImage2.containerRef} style={{width: syncedImage2.width}} />
                    </div>
                </div>
                <div className="swipe-diff__first">
                    <div className="swipe-diff__overlay">
                        <div className='swipe-diff__frame'>
                            <FullScreenshot className='swipe-diff__img' image={image1} imgRef={syncedImage1.containerRef} style={{width: syncedImage1.width}} />
                        </div>
                    </div>
                    <div className="swipe-diff-divider">
                        <div className="swipe-diff-divider__line"></div>
                        <div className="swipe-diff-divider__arrows">
                            <ArrowsMove />
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

export default withSyncedScale(SwipeDiff);
