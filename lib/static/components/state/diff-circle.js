'use strict';

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {keyframes} from 'styled-components';
import {CIRCLE_RADIUS} from '../../../constants/defaults';

export default class DiffCircle extends Component {
    static propTypes = {
        diffTarget: PropTypes.object.isRequired,
        diffBounds: PropTypes.object.isRequired,
        display: PropTypes.bool.isRequired,
        toggleDiff: PropTypes.func.isRequired
    };

    _getRect() {
        const {diffBounds, diffTarget} = this.props;
        const targetRect = diffTarget.getBoundingClientRect();
        const sizeCoeff = diffTarget.offsetWidth / parseInt(diffTarget.style.width);

        const rectHeight = Math.ceil(sizeCoeff * (diffBounds.bottom - diffBounds.top + 1));
        const rectWidth = Math.ceil(sizeCoeff * (diffBounds.right - diffBounds.left + 1));

        const rectMiddleX = (diffBounds.left + diffBounds.right) / 2;
        const rectMiddleY = (diffBounds.top + diffBounds.bottom) / 2;

        return {
            x: targetRect.left + sizeCoeff * rectMiddleX,
            y: targetRect.top + sizeCoeff * rectMiddleY,
            minSize: Math.floor(Math.sqrt(rectWidth * rectWidth + rectHeight * rectHeight))
        };
    }

    render() {
        const {display, toggleDiff} = this.props;

        if (!display) {
            return null;
        }

        const diffRect = this._getRect();
        const diffCircle = {
            width: `${diffRect.minSize}px`,
            height: `${diffRect.minSize}px`,
            top: `${Math.ceil(diffRect.y - diffRect.minSize / 2)}px`,
            left: `${Math.ceil(diffRect.x - diffRect.minSize / 2)}px`
        };
        const radius = diffRect.minSize + CIRCLE_RADIUS;

        const animation = keyframes`
            100% {
                transform: scale(${radius / diffRect.minSize})
            }
        `;

        return (
            <div
                className='diff-circle'
                style={{animation: `${animation} 1s ease-out`, ...diffCircle}}
                onAnimationEnd={() => toggleDiff()}
            >
            </div>
        );
    }
}
