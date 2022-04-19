'use strict';

import React, {Component, Fragment} from 'react';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import {capitalize} from 'lodash';
import ResizedScreenshot from '../screenshot/resized';
import SwipeDiff from './swipe-diff';
import SwitchDiff from './switch-diff';
import OnionSkinDiff from './onion-skin-diff';
import diffModes from '../../../../constants/diff-modes';

import './index.styl';

class StateFail extends Component {
    static propTypes = {
        image: PropTypes.shape({
            expectedImg: PropTypes.object.isRequired,
            actualImg: PropTypes.object.isRequired,
            diffImg: PropTypes.object.isRequired,
            diffClusters: PropTypes.array
        }).isRequired,
        // from store
        diffMode: PropTypes.string
    }

    constructor(props) {
        super(props);

        this.state = {diffMode: this.props.diffMode};
    }

    componentWillReceiveProps(nextProps) {
        if (this.state.diffMode === nextProps.diffMode) {
            return;
        }

        this.setState({diffMode: nextProps.diffMode});
    }

    _handleDiffModeClick = (diffMode) => {
        if (this.state.diffMode === diffMode) {
            return;
        }

        this.setState({diffMode});
    }

    _renderDiffModeItems() {
        return Object.values(diffModes).map((diffMode) => {
            return this._renderDiffModeItem(diffMode);
        });
    }

    _renderDiffModeItem(diffMode) {
        const className = classNames(
            'diff-modes__item',
            {'diff-modes__active': this.state.diffMode === diffMode}
        );

        return (
            <li key={diffMode} className={className} onClick={() => this._handleDiffModeClick(diffMode)}>{capitalize(diffMode)}</li>
        );
    }

    _renderImages() {
        const {image: {expectedImg, actualImg}} = this.props;
        // const newImg = {...actualImg, size: {...actualImg.size, width: 1000, height: 500}};

        switch (this.state.diffMode) {
            case diffModes.ONLY_DIFF:
                return this._renderOnlyDiff();

            case diffModes.SWITCH:
                return <SwitchDiff image1={expectedImg} image2={actualImg} />;

            case diffModes.SWIPE:
                return <SwipeDiff image1={expectedImg} image2={actualImg} />;

            case diffModes.ONION_SKIN:
                return <OnionSkinDiff image1={expectedImg} image2={actualImg} />;

            case diffModes.THREE_UP:
            default:
                return this._renderThreeImages();
        }
    }

    _renderOnlyDiff() {
        const {image: {diffImg, diffClusters}} = this.props;

        return this._drawImageBox('Diff', diffImg, diffClusters);
    }

    _renderThreeImages() {
        const {image: {expectedImg, actualImg, diffImg, diffClusters}} = this.props;

        return <Fragment>
            {this._drawExpectedAndActual(expectedImg, actualImg)}
            {this._drawImageBox('Diff', diffImg, diffClusters)}
        </Fragment>;
    }

    render() {
        return (
            <Fragment>
                {this._renderImages()}
                <div className="diff-modes-container">
                    <ul className="diff-modes">{this._renderDiffModeItems()}</ul>
                </div>
            </Fragment>
        );
    }

    _drawExpectedAndActual(expectedImg, actualImg) {
        return (
            <Fragment>
                {this._drawImageBox('Expected', expectedImg)}
                {this._drawImageBox('Actual', actualImg)}
            </Fragment>
        );
    }

    _drawImageBox(label, image, diffClusters) {
        return (
            <div className="image-box__image" style={{flex: image.size.width}}>
                <div className="image-box__title">{label}</div>
                <ResizedScreenshot image={image} diffClusters={diffClusters}/>
            </div>
        );
    }
}

export default connect(
    ({view: {diffMode}}) => ({diffMode})
)(StateFail);
