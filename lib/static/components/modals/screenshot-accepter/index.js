import React, {Component, Fragment} from 'react';
import ReactDOM from 'react-dom';
import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';
import PropTypes from 'prop-types';
import {isEmpty, isNumber, findIndex} from 'lodash';

import * as actions from '../../../modules/actions';
import ScreenshotAccepterHeader from './header';
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

        const {image, activeImageIndex} = this.props;
        const images = this._getActiveImages(activeImageIndex);
        const retryIndex = findIndex(images, {id: image.id});

        this.state = {
            activeImageIndex,
            retryIndex
        };
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.stateNameImageIds.length === this.props.stateNameImageIds.length) {
            return;
        }

        if (isEmpty(nextProps.stateNameImageIds)) {
            return this.setState({retryIndex: null, activeImageIndex: null});
        }

        if (this.state.activeImageIndex > nextProps.stateNameImageIds.length - 1) {
            const activeImageIndex = nextProps.stateNameImageIds.length - 1;
            const images = this._getActiveImages(activeImageIndex, nextProps);
            return this.setState({retryIndex: images.length - 1, activeImageIndex});
        }

        const images = this._getActiveImages(this.state.activeImageIndex, nextProps);
        this.setState({retryIndex: images.length - 1});
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

    onScreenshotAccept = (imageId) => {
        this.props.actions.acceptTest(imageId);
    }

    _getActiveImages(activeImageIndex = this.state.activeImageIndex, props = this.props) {
        const {imagesByStateName, stateNameImageIds} = props;

        return isNumber(activeImageIndex) ? imagesByStateName[stateNameImageIds[activeImageIndex]] : [];
    }

    render() {
        const {stateNameImageIds, onClose} = this.props;
        const {retryIndex, activeImageIndex} = this.state;
        const images = this._getActiveImages();
        const currImage = isNumber(retryIndex) ? images[retryIndex] : null;

        return (
            <Fragment>
                <ScreenshotAccepterHeader
                    images={images}
                    stateNameImageIds={stateNameImageIds}
                    retryIndex={retryIndex}
                    activeImageIndex={activeImageIndex}
                    onClose={onClose}
                    onRetryChange={this.onRetryChange}
                    onActiveImageChange={this.onActiveImageChange}
                    onScreenshotAccept={this.onScreenshotAccept}
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
