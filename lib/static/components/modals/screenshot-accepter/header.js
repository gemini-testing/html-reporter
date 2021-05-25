import React, {Component, Fragment} from 'react';
import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';
import {GlobalHotKeys} from 'react-hotkeys';
import PropTypes from 'prop-types';
import {uniqBy} from 'lodash';

import * as actions from '../../../modules/actions';
import Arrow from '../../icons/arrow';
import ArrowsClose from '../../icons/arrows-close';
import ControlButton from '../../controls/control-button';
import RetrySwitcher from '../../retry-switcher';

class ScreenshotAccepterHeader extends Component {
    static propTypes = {
        images: PropTypes.arrayOf(PropTypes.shape({
            id: PropTypes.string,
            parentId: PropTypes.string
        })),
        stateNameImageIds: PropTypes.arrayOf(PropTypes.string),
        retryIndex: PropTypes.number,
        activeImageIndex: PropTypes.number,
        onClose: PropTypes.func.isRequired,
        onRetryChange: PropTypes.func.isRequired,
        onActiveImageChange: PropTypes.func.isRequired,
        onScreenshotAccept: PropTypes.func.isRequired,
        // from store
        showOnlyDiff: PropTypes.bool.isRequired,
        scaleImages: PropTypes.bool.isRequired
    }

    constructor(props) {
        super(props);

        this._keyMap = {
            PREV_SCREENSHOT: ['up', 'w'],
            NEXT_SCREENSHOT: ['down', 's'],
            PREV_RETRY: ['left', 'a'],
            NEXT_RETRY: ['right', 'd'],
            ACCEPT_SCREENSHOT: ['space', 'enter'],
            SHOW_ONLY_DIFF: 'shift+d',
            SCALE_IMAGES: 'shift+s',
            CLOSE_MODAL: 'escape',
            IGNORE_META_UP: 'meta+up',
            IGNORE_META_DOWN: 'meta+down',
            IGNORE_META_S: 'meta+s'
        };
        this._keyHandlers = {
            PREV_SCREENSHOT: this.handlePrevScreenshot,
            NEXT_SCREENSHOT: this.handleNextScreenshot,
            PREV_RETRY: this.handlePrevRetry,
            NEXT_RETRY: this.handleNextRetry,
            ACCEPT_SCREENSHOT: this.handleScreenshotAccept,
            SHOW_ONLY_DIFF: this.props.actions.toggleOnlyDiff,
            SCALE_IMAGES: this.props.actions.toggleScaleImages,
            CLOSE_MODAL: this.props.onClose,
            IGNORE_META_UP: () => {},
            IGNORE_META_DOWN: () => {},
            IGNORE_META_S: () => {}
        };
    }

    handlePrevScreenshot = (event) => {
        event.preventDefault();

        const {stateNameImageIds, activeImageIndex, onActiveImageChange} = this.props;
        const newImageIndex = getPrevIndex(activeImageIndex, stateNameImageIds.length);

        onActiveImageChange(newImageIndex);
    }

    handleNextScreenshot = (event) => {
        event.preventDefault();

        const {stateNameImageIds, activeImageIndex, onActiveImageChange} = this.props;
        const newImageIndex = getNextIndex(activeImageIndex, stateNameImageIds.length);

        onActiveImageChange(newImageIndex);
    }

    handlePrevRetry = () => {
        const {images, retryIndex, onRetryChange} = this.props;
        const newRetryIndex = getPrevIndex(retryIndex, images.length);

        onRetryChange(newRetryIndex);
    }

    handleNextRetry = () => {
        const {images, retryIndex, onRetryChange} = this.props;
        const newRetryIndex = getNextIndex(retryIndex, images.length);

        onRetryChange(newRetryIndex);
    }

    handleScreenshotAccept = (event) => {
        event.preventDefault();

        const {images, retryIndex, onScreenshotAccept} = this.props;
        const imageId = images[retryIndex].id;

        onScreenshotAccept(imageId);
    }

    render() {
        const {images, stateNameImageIds, retryIndex, onClose, onRetryChange, scaleImages, showOnlyDiff} = this.props;
        const resultIds = uniqBy(images, 'id').map((image) => image.parentId);
        const isArrowControlDisabed = stateNameImageIds.length <= 1;

        return (
            <Fragment>
                <GlobalHotKeys keyMap={this._keyMap} handlers={this._keyHandlers} />
                <header className="screenshot-accepter__header container">
                    <div className="screenshot-accepter__controls state-controls">
                        <ControlButton
                            label={<Arrow />}
                            title="Show previous image (↑,w)"
                            isSuiteControl={true}
                            isDisabled={isArrowControlDisabed}
                            extendClassNames="screenshot-accepter__arrow-up-btn"
                            handler={this.handlePrevScreenshot}
                        />
                        <ControlButton
                            label={<Arrow />}
                            title="Show next image (↓,s)"
                            isSuiteControl={true}
                            isDisabled={isArrowControlDisabed}
                            extendClassNames="screenshot-accepter__arrow-down-btn"
                            handler={this.handleNextScreenshot}
                        />
                        <ControlButton
                            label="✔ Accept"
                            title="Accept image (Space,Enter)"
                            isSuiteControl={true}
                            isDisabled={images.length === 0}
                            extendClassNames="screenshot-accepter__accept-btn"
                            handler={this.handleScreenshotAccept}
                        />
                        <RetrySwitcher
                            title="Switch to selected attempt (left: ←,a; right: →,d)"
                            resultIds={resultIds}
                            retryIndex={retryIndex}
                            onChange={onRetryChange}
                        />
                        <ControlButton
                            label="Show only diff"
                            title="Show only difference image (Shift+d)"
                            isSuiteControl={true}
                            isActive={showOnlyDiff}
                            handler={this.props.actions.toggleOnlyDiff}
                        />
                        <ControlButton
                            label="Scale images"
                            title="Scale images in one line (Shift+s)"
                            isSuiteControl={true}
                            isActive={scaleImages}
                            handler={this.props.actions.toggleScaleImages}
                        />
                        <ControlButton
                            label={<Fragment>
                                <ArrowsClose />
                                Switch accept mode
                            </Fragment>}
                            title="Close mode with fast screenshot accepting (Escape)"
                            isSuiteControl={true}
                            extendClassNames="screenshot-accepter__arrows-close-btn"
                            handler={onClose}
                        />
                    </div>
                </header>
            </Fragment>
        );
    }
}

export default connect(
    ({view: {showOnlyDiff, scaleImages}}) => ({showOnlyDiff, scaleImages}),
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(ScreenshotAccepterHeader);

function getPrevIndex(currIndex, arrLength) {
    return currIndex > 0 ? currIndex - 1 : arrLength - 1;
}

function getNextIndex(currIndex, arrLength) {
    return currIndex < arrLength - 1 ? currIndex + 1 : 0;
}
