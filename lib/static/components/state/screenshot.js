'use strict';

import React, {Component} from 'react';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import LazyLoad from '@gemini-testing/react-lazyload';
import {keyframes} from 'styled-components';
import Placeholder from './placeholder';

const CIRCLE_RADIUS = 150;

class Screenshot extends Component {
    static propTypes = {
        noCache: PropTypes.bool,
        image: PropTypes.shape({
            path: PropTypes.string.isRequired,
            size: PropTypes.shape({
                width: PropTypes.number,
                height: PropTypes.number
            }),
            diffBounds: PropTypes.shape({
                left: PropTypes.number,
                top: PropTypes.number,
                right: PropTypes.number,
                bottom: PropTypes.number
            })
        }).isRequired,
        lazyLoadOffset: PropTypes.number
    }

    static defaultProps = {
        noCache: false
    }

    _getScreenshotComponent(elem, placeholder = null) {
        const {lazyLoadOffset: offset} = this.props;

        return offset
            ? <LazyLoad offset={offset} debounce={50} placeholder={placeholder} once>{elem}</LazyLoad>
            : elem;
    }

    _clickEffect(rect) {
        var d = document.createElement('div');
        d.className = 'clickEffect';

        d.style.width = `${rect.minSize}px`;
        d.style.height = `${rect.minSize}px`;
        d.style.top = `${rect.y - rect.minSize / 2}px`;
        d.style.left = `${rect.x - rect.minSize / 2}px`;
        const radius = rect.minSize + CIRCLE_RADIUS;

        const animation = keyframes`
            0% {
                opacity: 0.4;
            }
            100% {
                opacity: 0.2;
                transform: scale(${radius / rect.minSize})
            }
        `;
        d.style.animation = `${animation} 1s ease-out`;

        document.body.appendChild(d);
        d.addEventListener('animationend', (() => d.parentElement.removeChild(d)).bind(this));
    }

    _getRect({diffBounds, targetRect, widthCoeff, heightCoeff}) {
        const rectWidth = widthCoeff * (diffBounds.bottom - diffBounds.top);
        const rectHeight = heightCoeff * (diffBounds.right - diffBounds.left);

        const rectMiddleX = diffBounds.left + (diffBounds.right - diffBounds.left) / 2;
        const rectMiddleY = diffBounds.top + (diffBounds.bottom - diffBounds.top) / 2;

        return {
            x: targetRect.left + widthCoeff * rectMiddleX,
            y: targetRect.top + heightCoeff * rectMiddleY,
            minSize: Math.sqrt(rectWidth * rectWidth + rectHeight * rectHeight) + 1
        };
    }

    _handle = (diffBounds) => (e) => {
        if (!diffBounds) {
            return;
        }

        const targetRect = e.target.getBoundingClientRect();

        const widthCoeff = e.target.width / e.target.naturalWidth;
        const heightCoeff = e.target.height / e.target.naturalHeight;
        const rect = this._getRect({diffBounds, widthCoeff, heightCoeff, targetRect});

        this._clickEffect(rect);
    };

    render() {
        const {noCache, image: {path: imgPath, size: imgSize, diffBounds}} = this.props;

        const url = noCache
            ? addTimestamp(encodeUri(imgPath))
            : encodeUri(imgPath);

        if (!imgSize) {
            const elem = <img src={url} className="image-box__screenshot image-box__screenshot_auto-size" />;

            return this._getScreenshotComponent(elem);
        }

        const paddingTop = ((imgSize.height / imgSize.width) * 100).toFixed(2);
        const elem = <div onClick={this._handle(diffBounds)} className="image-box__screenshot image-box__screenshot_fixed-size" style={{width: imgSize.width, paddingTop: `${paddingTop}%`, 'backgroundImage': `url(${url})`}} />;

        const placeholder = <Placeholder width={imgSize.width} paddingTop={`${paddingTop}%`} />;

        return this._getScreenshotComponent(elem, placeholder);
    }
}

function encodeUri(imagePath) {
    return imagePath
        .split('/')
        .map((item) => encodeURIComponent(item))
        .join('/');
}

// for prevent image caching
function addTimestamp(imagePath) {
    return `${imagePath}?t=${Date.now()}`;
}

export default connect(({view: {lazyLoadOffset}}) => ({lazyLoadOffset}))(Screenshot);
