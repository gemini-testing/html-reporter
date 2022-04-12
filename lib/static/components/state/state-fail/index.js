'use strict';

import React, {Component, Fragment} from 'react';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import classNames from 'classnames';
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
        if (this.state.diffMode !== nextProps.diffMode) {
            this.setState({diffMode: nextProps.diffMode});
        }
    }

    _handleDiffModeClick = (diffMode) => {
        if (this.state.diffMode === diffMode) {
            return;
        }

        this.setState({diffMode});
    }

    _renderDiffModeItems() {
        const diffModeItems = Object.values(diffModes).map((diffMode) => {
            return this._renderDiffModeItem(diffMode);
        });

        return (
            <ul className="diff-modes">
                {diffModeItems}
            </ul>
        );
    }

    _renderDiffModeItem(diffMode) {
        const className = classNames(
            'diff-modes__item',
            {'diff-modes__active': this.state.diffMode === diffMode.id}
        );

        return <li key={diffMode.id} title={diffMode.description} className={className} onClick={() => this._handleDiffModeClick(diffMode.id)}>{diffMode.title}</li>;
    }

    _renderImages() {
        const {image: {expectedImg, actualImg}} = this.props;

        switch (this.state.diffMode) {
            case diffModes.ONLY_DIFF.id:
                return this._renderOnlyDiff();

            case diffModes.SWITCH.id:
                return <SwitchDiff image1={expectedImg} image2={actualImg} />;

            case diffModes.SWIPE.id:
                return <SwipeDiff image1={expectedImg} image2={actualImg} />;

            case diffModes.ONION_SKIN.id:
                return <OnionSkinDiff image1={expectedImg} image2={actualImg} />;

            case diffModes.THREE_UP_SCALED.id:
                return <div className="image-box__scaled">
                    {this._renderThreeImages()}
                </div>;

            case diffModes.THREE_UP.id:
            default:
                return this._renderThreeImages();
        }
    }

    _renderOnlyDiff() {
        const {image: {diffImg, diffClusters}} = this.props;

        return this._drawImageBox(diffImg, {diffClusters});
    }

    _renderThreeImages() {
        const {image: {expectedImg, actualImg, diffImg, diffClusters}} = this.props;

        return <Fragment>
            {this._drawExpectedAndActual(expectedImg, actualImg)}
            {this._drawImageBox(diffImg, {label: 'Diff', diffClusters})}
        </Fragment>;
    }

    render() {
        return (
            <Fragment>
                {this._renderDiffModeItems()}
                {this._renderImages()}
            </Fragment>
        );
    }

    _drawExpectedAndActual(expectedImg, actualImg) {
        return (
            <Fragment>
                {this._drawImageBox(expectedImg, {label: 'Expected'})}
                {this._drawImageBox(actualImg, {label: 'Actual'})}
            </Fragment>
        );
    }

    _drawImageBox(image, {label, diffClusters} = {}) {
        const text = `${label} (${image.size.width}x${image.size.height})`;

        return (
            <div className="image-box__image" style={{flex: image.size.width}}>
                {label && <div className="image-box__title">{text}</div>}
                <ResizedScreenshot image={image} diffClusters={diffClusters}/>
            </div>
        );
    }
}

export default connect(
    ({view: {diffMode}}) => ({diffMode})
)(StateFail);
