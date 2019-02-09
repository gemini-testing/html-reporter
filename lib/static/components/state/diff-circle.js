'use strict';

import React, {Component, Fragment} from 'react';
import PropTypes from 'prop-types';
import {keyframes} from 'styled-components';

const CIRCLE_RADIUS = 150;

export default class DiffCircle extends Component {
    static propTypes = {
        diffTarget: PropTypes.object,
        diffBounds: PropTypes.object,
        display: PropTypes.bool,
        toggleDiff: PropTypes.func
    };

    _getRect() {
        const {diffBounds, diffTarget} = this.props;
        const targetRect = diffTarget.getBoundingClientRect();
        const sizeCoeff = diffTarget.offsetWidth / parseInt(diffTarget.style.width);
        console.log('COEFF', sizeCoeff);
        const rectWidth = sizeCoeff * (diffBounds.bottom - diffBounds.top);
        const rectHeight = sizeCoeff * (diffBounds.right - diffBounds.left);

        const rectMiddleX = (diffBounds.left + diffBounds.right) / 2;
        const rectMiddleY = (diffBounds.top + diffBounds.bottom) / 2;

        return {
            x: targetRect.left + sizeCoeff * rectMiddleX,
            y: targetRect.top + sizeCoeff * rectMiddleY,
            minSize: Math.sqrt(rectWidth * rectWidth + rectHeight * rectHeight) + 1
        };
    }

    render() {
        const {display, toggleDiff} = this.props;

        if (!display) {
            return <Fragment></Fragment>;
        }

        const diffRect = this._getRect();
        const diffCircle = {
            width: `${diffRect.minSize}px`,
            height: `${diffRect.minSize}px`,
            top: `${diffRect.y - diffRect.minSize / 2}px`,
            left: `${diffRect.x - diffRect.minSize / 2}px`
        };
        const radius = diffRect.minSize + CIRCLE_RADIUS;

        const animation = keyframes`
            0% {
                opacity: 0.4;
            }
            100% {
                opacity: 0.2;
                transform: scale(${radius / diffRect.minSize})
            }
        `;

        return (
            <div
                ref='diffCircle'
                className='diff-circle'
                style={{animation: `${animation} 1s ease-out`, ...diffCircle}}
                onAnimationEnd={() => toggleDiff(false)}
            >
            </div>
        );
    }
}
