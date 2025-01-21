import React, {Component, Fragment} from 'react';
import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';
import PropTypes from 'prop-types';
import {isEmpty, isNumber, size, get, findIndex, last} from 'lodash';

import * as actions from '../../../modules/actions';
import ScreenshotAccepterHeader from './header';
import ScreenshotAccepterMeta from './meta';
import ScreenshotAccepterBody from './body';
import {getAcceptableImagesByStateName} from '../../../modules/selectors/tree';
import {staticImageAccepterPropType} from '../../../modules/static-image-accepter';

import './style.css';
import {AnalyticsContext} from '@/static/new-ui/providers/analytics';
import {preloadImage} from '../../../modules/utils/imageEntity';

const PRELOAD_IMAGE_COUNT = 3;

class ScreenshotAccepter extends Component {
    static contextType = AnalyticsContext;

    static propTypes = {
        view: PropTypes.shape({
            diffMode: PropTypes.string.isRequired
        }),
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
        activeImageIndex: PropTypes.number.isRequired,
        staticImageAccepter: staticImageAccepterPropType,
        actions: PropTypes.object.isRequired
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
            showMeta: false,
            disposables: {}
        };
        this.topRef = React.createRef();

        this.totalImagesCount = size(imagesByStateName);

        for (let i = 1; i <= PRELOAD_IMAGE_COUNT; i++) {
            this._preloadAdjacentImages(activeImageIndex, stateNameImageIds, i);
        }

        this.analytics = this.context;
    }

    componentWillUnmount() {
        Object.values(this.state.disposables)
            .forEach(disposeCallback => disposeCallback());
    }

    componentDidUpdate() {
        this.topRef.current.parentNode.scrollTo(0, 0);
    }

    onRetryChange = (retryIndex) => {
        this.setState({retryIndex});
    };

    onActiveImageChange = (activeImageIndex) => {
        const images = this._getActiveImages(activeImageIndex);

        this.setState({retryIndex: images.length - 1, activeImageIndex});
        this._preloadAdjacentImages(activeImageIndex, this.state.stateNameImageIds);
    };

    onScreenshotAccept = async (imageId) => {
        const currentImages = this._getActiveImages();
        const {stateName} = currentImages[0];

        const acceptedStateNameImageIdIndex = this.state.stateNameImageIds.findIndex((stateNameImageId) => {
            const currImages = this.props.imagesByStateName[stateNameImageId];

            return currImages.some(img => img.id === imageId);
        });

        let updatedImageId = this.props.staticImageAccepter.enabled
            ? this._stageScreenshot(imageId, stateName)
            : await this._acceptScreenshot(imageId, stateName);

        if (updatedImageId === null) {
            return;
        }

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
        this._preloadAdjacentImages(activeImageIndex, stateNameIds);
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

        if (this.props.staticImageAccepter.enabled) {
            this.props.actions.staticAccepterUndoDelayScreenshot();
        } else {
            await this.props.actions.thunkRevertImages({imageIds: [imageId], shouldCommitUpdatesToTree: false});
            this.delayedTestResults.pop();
        }

        this.setState({
            activeImageIndex: ind,
            stateNameImageIds: previousStateNameImageId,
            retryIndex: images.length - 1
        });
        this._preloadAdjacentImages(ind, previousStateNameImageId);
    };

    onShowMeta = () => {
        this.setState({showMeta: !this.state.showMeta});
    };

    onClose = () => {
        if (isEmpty(this.props.staticImageAccepter.accepterDelayedImages) && isEmpty(this.delayedTestResults)) {
            return this.props.onClose();
        }

        if (this.props.staticImageAccepter.enabled) {
            const imageIdsToStage = this.props.staticImageAccepter.accepterDelayedImages.map(({imageId}) => imageId);

            this.props.actions.staticAccepterStageScreenshot(imageIdsToStage);
        } else {
            this.props.actions.commitAcceptedImagesToTree(this.delayedTestResults);
        }

        this.props.onClose();
    };

    onCommitChanges = () => {
        this.props.actions.staticAccepterOpenConfirm();
    };

    _getActiveImages(
        activeImageIndex = this.state.activeImageIndex,
        stateNameImageIds = this.state.stateNameImageIds
    ) {
        return isNumber(activeImageIndex)
            ? this.props.imagesByStateName[stateNameImageIds[activeImageIndex]]
            : [];
    }

    async _acceptScreenshot(imageId, stateName) {
        const updatedData = await this.props.actions.thunkAcceptImages({imageIds: [imageId], shouldCommitUpdatesToTree: false});
        this.analytics?.trackScreenshotsAccept();

        if (updatedData === null) {
            return null;
        }

        this.delayedTestResults = this.delayedTestResults.concat(updatedData);

        const updatedImagesData = get(updatedData, '[0].images', []);
        const {id: updatedImageId} = updatedImagesData.find(img => img.stateName === stateName) || {};

        return updatedImageId;
    }

    _stageScreenshot(imageId, stateName) {
        const stateNameImageId = this.props.stateNameImageIds.find(stateNameImageId => {
            return this.props.imagesByStateName[stateNameImageId].some(img => img.id === imageId);
        });

        this.props.actions.staticAccepterDelayScreenshot({imageId, stateName, stateNameImageId});

        return imageId;
    }

    _preloadAdjacentImages(activeImageIndex, stateNameImageIds, offset = PRELOAD_IMAGE_COUNT) {
        const screensCount = size(stateNameImageIds);
        const previosImagesIndex = (screensCount + activeImageIndex - offset) % screensCount;
        const nextImagesIndex = (activeImageIndex + offset) % screensCount;

        [previosImagesIndex, nextImagesIndex].filter(ind => ind >= 0).forEach(preloadingImagesIndex => {
            const stateNameImageId = stateNameImageIds[preloadingImagesIndex];
            const {expectedImg, actualImg, diffImg} = last(this.props.imagesByStateName[stateNameImageId]);

            const disposables = {};

            [expectedImg, actualImg, diffImg].filter(Boolean).forEach(({path}) => {
                const disposeCallback = preloadImage(path);

                disposables[path] = disposeCallback;
            });

            this.setState({
                disposables: {
                    ...this.state.disposables,
                    ...disposables
                }
            });
        });
    }

    render() {
        const {actions, view, staticImageAccepter} = this.props;
        const {retryIndex, stateNameImageIds, activeImageIndex, showMeta} = this.state;
        const images = this._getActiveImages();
        const currImage = isNumber(retryIndex) ? images[retryIndex] : null;
        const acceptedImagesCount = this.totalImagesCount - stateNameImageIds.length;

        return (
            <Fragment>
                <div ref={this.topRef}></div>
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
                    onCommitChanges={this.onCommitChanges}
                    staticImageAccepter={staticImageAccepter}
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
        const staticImageAccepter = state.staticImageAccepter;

        return {
            view: state.view,
            imagesByStateName,
            stateNameImageIds,
            activeImageIndex,
            staticImageAccepter
        };
    },
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(ScreenshotAccepter);
