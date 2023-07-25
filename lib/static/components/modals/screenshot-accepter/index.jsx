import React, {Component, Fragment} from 'react';
import ReactDOM from 'react-dom';
import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';
import PropTypes from 'prop-types';
import {isEmpty, isNumber, size, get, findIndex, last} from 'lodash';

import * as actions from '../../../modules/actions';
import ScreenshotAccepterHeader from './header';
import ScreenshotAccepterMeta from './meta';
import ScreenshotAccepterBody from './body';
import {getAcceptableImagesByStateName} from '../../../modules/selectors/tree';
import {preloadImage} from '../../../modules/utils';

import './style.css';

const PRELOAD_IMAGE_COUNT = 3;

class ScreenshotAccepter extends Component {
    static propTypes = {
        image: PropTypes.shape({
            id: PropTypes.string.isRequired,
            parentId: PropTypes.string.isRequired,
            stateName: PropTypes.string.isRequired
        }).isRequired,
        // from ModalContainer
        onClose: PropTypes.func.isRequired,
        // store
        imagesByStateName: PropTypes.object.isRequired,
        stateNameImageIds: PropTypes.arrayOf(PropTypes.string).isRequired,
        activeImageIndex: PropTypes.number.isRequired
    };

    constructor(props) {
        super(props);

        const {image, activeImageIndex, stateNameImageIds, imagesByStateName} = this.props;
        const images = this._getActiveImages(activeImageIndex, stateNameImageIds);
        const retryIndex = findIndex(images, {id: image.id});

        this.acceptedImages = [];
        this.delayedTestResults = [];
        this.state = {
            stateNameImageIds,
            activeImageIndex,
            retryIndex,
            showMeta: false
        };

        this.totalImagesCount = size(imagesByStateName);

        for (let i = 1; i <= PRELOAD_IMAGE_COUNT; i++) {
            this._preloadAdjacentImages(i);
        }
    }

    componentDidUpdate() {
        ReactDOM.findDOMNode(this).parentNode.scrollTo(0, 0);
    }

    onRetryChange = (retryIndex) => {
        this.setState({retryIndex});
    };

    onActiveImageChange = (activeImageIndex) => {
        const images = this._getActiveImages(activeImageIndex);

        this.setState({retryIndex: images.length - 1, activeImageIndex});
        this._preloadAdjacentImages();
    };

    onScreenshotAccept = async (imageId) => {
        const currentImages = this._getActiveImages();
        const {stateName} = currentImages[0];
        const updatedData = await this.props.actions.screenshotAccepterAccept(imageId);

        if (updatedData === null) {
            return;
        }

        this.delayedTestResults = this.delayedTestResults.concat(updatedData);

        const updatedImagesData = get(updatedData, '[0].images', []);
        const {id: updatedImageId} = updatedImagesData.find(img => img.stateName === stateName) || {};
        const acceptedStateNameImageIdIndex = this.state.stateNameImageIds.findIndex((stateNameImageId) => {
            const currImages = this.props.imagesByStateName[stateNameImageId];

            return currImages.some(img => img.id === imageId);
        });

        this.acceptedImages.push({
            stateNameImageId: this.state.stateNameImageIds[acceptedStateNameImageIdIndex],
            ind: acceptedStateNameImageIdIndex,
            imageId: updatedImageId
        });

        const stateNameIds = this.state.stateNameImageIds.filter((_, ind) => ind !== acceptedStateNameImageIdIndex);

        if (isEmpty(stateNameIds)) {
            return this.setState({
                activeImageIndex: null,
                stateNameImageIds: stateNameIds,
                retryIndex: null
            });
        }

        const activeImageIndex = Math.min(this.state.activeImageIndex, stateNameIds.length - 1);
        const newImages = this._getActiveImages(activeImageIndex, stateNameIds);

        this.setState({
            activeImageIndex,
            stateNameImageIds: stateNameIds,
            retryIndex: newImages.length - 1
        });
        this._preloadAdjacentImages();
    };

    onScreenshotUndo = async () => {
        if (isEmpty(this.acceptedImages)) {
            return;
        }

        const {stateNameImageIds} = this.state;
        const {stateNameImageId, ind, imageId} = this.acceptedImages.pop();

        const previousStateNameImageId = [
            ...stateNameImageIds.slice(0, ind),
            stateNameImageId,
            ...stateNameImageIds.slice(ind)
        ];
        const images = this._getActiveImages(ind, previousStateNameImageId);

        await this.props.actions.undoAcceptImage(imageId, {skipTreeUpdate: true});

        this.delayedTestResults.pop();

        this.setState({
            activeImageIndex: ind,
            stateNameImageIds: previousStateNameImageId,
            retryIndex: images.length - 1
        });
        this._preloadAdjacentImages();
    };

    onShowMeta = () => {
        this.setState({showMeta: !this.state.showMeta});
    };

    onClose = () => {
        if (!isEmpty(this.delayedTestResults)) {
            this.props.actions.applyDelayedTestResults(this.delayedTestResults);
        }

        this.props.onClose();
    };

    _getActiveImages(
        activeImageIndex = this.state.activeImageIndex,
        stateNameImageIds = this.state.stateNameImageIds
    ) {
        return isNumber(activeImageIndex)
            ? this.props.imagesByStateName[stateNameImageIds[activeImageIndex]]
            : [];
    }

    _preloadAdjacentImages(offset = PRELOAD_IMAGE_COUNT) {
        const screensCount = size(this.state.stateNameImageIds);
        const previosImagesIndex = (screensCount + this.state.activeImageIndex - offset) % screensCount;
        const nextImagesIndex = (this.state.activeImageIndex + offset) % screensCount;

        [previosImagesIndex, nextImagesIndex].filter(ind => ind >= 0).forEach(preloadingImagesIndex => {
            const stateNameImageId = this.state.stateNameImageIds[preloadingImagesIndex];
            const {expectedImg, actualImg, diffImg} = last(this.props.imagesByStateName[stateNameImageId]);

            [expectedImg, actualImg, diffImg].filter(Boolean).forEach(({path}) => preloadImage(path));
        });
    }

    render() {
        const {actions, view} = this.props;
        const {retryIndex, stateNameImageIds, activeImageIndex, showMeta} = this.state;
        const images = this._getActiveImages();
        const currImage = isNumber(retryIndex) ? images[retryIndex] : null;
        const acceptedImagesCount = this.totalImagesCount - stateNameImageIds.length;

        return (
            <Fragment>
                <ScreenshotAccepterHeader
                    actions={actions}
                    view={view}
                    images={images}
                    stateNameImageIds={stateNameImageIds}
                    retryIndex={retryIndex}
                    activeImageIndex={activeImageIndex}
                    showMeta={showMeta}
                    onClose={this.onClose}
                    totalImages={this.totalImagesCount}
                    acceptedImages={acceptedImagesCount}
                    onRetryChange={this.onRetryChange}
                    onActiveImageChange={this.onActiveImageChange}
                    onScreenshotAccept={this.onScreenshotAccept}
                    onScreenshotUndo={this.onScreenshotUndo}
                    onShowMeta={this.onShowMeta}
                />
                <ScreenshotAccepterMeta
                    showMeta={showMeta}
                    image={currImage}
                />
                <ScreenshotAccepterBody image={currImage} />
            </Fragment>
        );
    }
}

export default connect(
    (state, {image}) => {
        const imagesByStateName = getAcceptableImagesByStateName(state);
        const stateNameImageIds = Object.keys(imagesByStateName);
        const result = state.tree.results.byId[image.parentId];
        const browserId = result.parentId;
        const stateNameImageId = `${browserId} ${image.stateName}`;
        const activeImageIndex = stateNameImageIds.indexOf(stateNameImageId);

        return {
            view: state.view,
            imagesByStateName,
            stateNameImageIds,
            activeImageIndex
        };
    },
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(ScreenshotAccepter);
