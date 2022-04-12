import React, {Component} from 'react';
import classNames from 'classnames';
import PropTypes from 'prop-types';
import FullScreenshot from '../../screenshot/full';
import ArrowsMove from '../../../icons/arrows-move';

import './index.styl';

function clamp(n, min = 0, max = 100) {
    return Math.max(Math.min(n, max), min);
}

export default class SwipeDiff extends Component {
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
        }).isRequired
    }

    constructor(props) {
        super(props);

        const {image1, image2} = props;

        this._swipeContainer = React.createRef();
        this._swipeContainerLeft = 0;
        this._maxHeight = Math.max(image1.size.height, image2.size.height);
        this._maxWidth = Math.max(image1.size.width, image2.size.width);

        const middlePosX = Math.min(image1.size.width, image2.size.width) / 2;

        this.state = {
            mousePosX: clamp(middlePosX, 0, image1.size.width),
            isPressed: false
        };
    }

    componentDidMount() {
        this._swipeContainerLeft = this._swipeContainer.current.getBoundingClientRect().left;
    }

    _getMousePosX(e) {
        const newMousePosX = e.pageX - this._swipeContainerLeft - window.scrollX;
        return clamp(newMousePosX, 0, this.props.image1.size.width);
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
        const {image1, image2} = this.props;
        const {isPressed} = this.state;

        const img1PosX = 100 - this._calcImgPosX(image1.size.width);
        const img2PosX = this._calcImgPosX(image2.size.width);

        const className = classNames(
            'swipe-diff',
            {'swipe-diff_pressed': isPressed}
        );

        return (
            <div
                className={className}
                style={{width: this._maxWidth, height: this._maxHeight, '--img1-pos-x': `${img1PosX}%`, '--img2-pos-x': `${img2PosX}%`}}
                ref={this._swipeContainer}
                onMouseDown={this._handleMouseDown}
            >
                <div className="swipe-diff__first">
                    <div className="swipe-diff__overlay">
                        <div className="swipe-diff__frame">
                            <FullScreenshot className='swipe-diff__img' image={image1} />
                        </div>
                    </div>
                    <div className="swipe-diff-divider" style={{height: this._maxHeight}}>
                        <div className="swipe-diff-divider__line"></div>
                        <div className="swipe-diff-divider__arrows">
                            <ArrowsMove />
                        </div>
                    </div>
                </div>
                <div className='swipe-diff__second' style={{width: image2.size.width}}>
                    <div className="swipe-diff__frame">
                        <FullScreenshot className='swipe-diff__img' image={image2} style={{height: image2.size.height}} />
                    </div>
                </div>
            </div>
        );
    }
}
