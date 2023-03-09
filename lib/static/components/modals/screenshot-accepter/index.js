import React, {Component, Fragment} from 'react';
import ReactDOM from 'react-dom';
import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';
import PropTypes from 'prop-types';
import {isEmpty, isNumber, findIndex} from 'lodash';

import * as actions from '../../../modules/actions';
import ScreenshotAccepterHeader from './header';
import ScreenshotAccepterMeta from './meta';
import ScreenshotAccepterBody from './body';
import {getAcceptableImagesByStateName} from '../../../modules/selectors/tree';

import './style.css';

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
    }

    constructor(props) {
        super(props);

        const {image, activeImageIndex, stateNameImageIds} = this.props;
        const images = this._getActiveImages(activeImageIndex, stateNameImageIds);
        const retryIndex = findIndex(images, {id: image.id});

        this.delayedTestResults = [];
        this.state = {
            stateNameImageIds,
            activeImageIndex,
            retryIndex,
            showMeta: false
        };
    }

    componentDidUpdate() {
        ReactDOM.findDOMNode(this).parentNode.scrollTo(0, 0);
    }

    onRetryChange = (retryIndex) => {
        this.setState({retryIndex});
    }

    onActiveImageChange = (activeImageIndex) => {
        const images = this._getActiveImages(activeImageIndex);

        this.setState({retryIndex: images.length - 1, activeImageIndex});
    }

    onScreenshotAccept = async (imageId) => {
        const updatedData = await this.props.actions.screenshotAccepterAccept(imageId);

        if (updatedData === null) {
            return;
        }

        this.delayedTestResults = this.delayedTestResults.concat(updatedData);

        const stateNameIds = this.state.stateNameImageIds.filter(stateNameImageId => {
            const currImages = this.props.imagesByStateName[stateNameImageId];

            return !currImages.some(img => img.id === imageId);
        });

        if (isEmpty(stateNameIds)) {
            return this.setState({
                activeImageIndex: null,
                stateNameImageIds: stateNameIds,
                retryIndex: null
            });
        }

        const activeImageIndex = Math.min(this.state.activeImageIndex, stateNameIds.length - 1);
        const images = this._getActiveImages(activeImageIndex, stateNameIds);

        this.setState({
            activeImageIndex,
            stateNameImageIds: stateNameIds,
            retryIndex: images.length - 1
        });
    }

    onShowMeta = () => {
        this.setState({showMeta: !this.state.showMeta});
    };

    onClose = () => {
        if (!isEmpty(this.delayedTestResults)) {
            this.props.actions.applyDelayedTestResults(this.delayedTestResults);
        }

        this.props.onClose();
    }

    _getActiveImages(
        activeImageIndex = this.state.activeImageIndex,
        stateNameImageIds = this.state.stateNameImageIds
    ) {
        return isNumber(activeImageIndex)
            ? this.props.imagesByStateName[stateNameImageIds[activeImageIndex]]
            : [];
    }

    render() {
        const {retryIndex, stateNameImageIds, activeImageIndex, showMeta} = this.state;
        const images = this._getActiveImages();
        const currImage = isNumber(retryIndex) ? images[retryIndex] : null;

        return (
            <Fragment>
                <ScreenshotAccepterHeader
                    images={images}
                    stateNameImageIds={stateNameImageIds}
                    retryIndex={retryIndex}
                    activeImageIndex={activeImageIndex}
                    showMeta={showMeta}
                    onClose={this.onClose}
                    onRetryChange={this.onRetryChange}
                    onActiveImageChange={this.onActiveImageChange}
                    onScreenshotAccept={this.onScreenshotAccept}
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
            imagesByStateName,
            stateNameImageIds,
            activeImageIndex
        };
    },
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(ScreenshotAccepter);
