import React, {Component, Fragment} from 'react';
import {GlobalHotKeys} from 'react-hotkeys';
import PropTypes from 'prop-types';
import {uniqBy} from 'lodash';

import ProgressBar from '../../progress-bar';
import ControlButton from '../../controls/control-button';
import ControlSelect from '../../controls/selects/control';
import RetrySwitcher from '../../retry-switcher';
import {DiffModes} from '../../../../constants/diff-modes';
import {ChevronsExpandUpRight, ArrowUturnCcwDown, ArrowUp, ArrowDown, Check} from '@gravity-ui/icons';
import {staticImageAccepterPropType} from '../../../modules/static-image-accepter';

export default class ScreenshotAccepterHeader extends Component {
    static propTypes = {
        view: PropTypes.shape({
            diffMode: PropTypes.string.isRequired
        }),
        images: PropTypes.arrayOf(PropTypes.shape({
            id: PropTypes.string,
            parentId: PropTypes.string
        })),
        stateNameImageIds: PropTypes.arrayOf(PropTypes.string),
        retryIndex: PropTypes.number,
        activeImageIndex: PropTypes.number,
        showMeta: PropTypes.bool.isRequired,
        totalImages: PropTypes.number.isRequired,
        acceptedImages: PropTypes.number.isRequired,
        onClose: PropTypes.func.isRequired,
        onRetryChange: PropTypes.func.isRequired,
        onActiveImageChange: PropTypes.func.isRequired,
        onScreenshotAccept: PropTypes.func.isRequired,
        onScreenshotUndo: PropTypes.func.isRequired,
        onShowMeta: PropTypes.func.isRequired,
        onCommitChanges: PropTypes.func.isRequired,
        staticImageAccepter: staticImageAccepterPropType,
        actions: PropTypes.object.isRequired
    };

    constructor(props) {
        super(props);

        this._keyMap = {
            PREV_SCREENSHOT: ['up', 'w'],
            NEXT_SCREENSHOT: ['down', 's'],
            PREV_RETRY: ['left', 'a'],
            NEXT_RETRY: ['right', 'd'],
            ACCEPT_SCREENSHOT: ['space', 'enter'],
            UNDO_SCREEN: 'backspace',
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
            UNDO_SCREEN: this.handleScreenUndo,
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
    };

    handleNextScreenshot = (event) => {
        event.preventDefault();

        const {stateNameImageIds, activeImageIndex, onActiveImageChange} = this.props;
        const newImageIndex = getNextIndex(activeImageIndex, stateNameImageIds.length);

        onActiveImageChange(newImageIndex);
    };

    handlePrevRetry = () => {
        const {images, retryIndex, onRetryChange} = this.props;
        const newRetryIndex = getPrevIndex(retryIndex, images.length);

        onRetryChange(newRetryIndex);
    };

    handleNextRetry = () => {
        const {images, retryIndex, onRetryChange} = this.props;
        const newRetryIndex = getNextIndex(retryIndex, images.length);

        onRetryChange(newRetryIndex);
    };

    handleScreenshotAccept = (event) => {
        event.preventDefault();

        const {images, retryIndex, onScreenshotAccept} = this.props;

        if (retryIndex === null) {
            return;
        }

        const imageId = images[retryIndex].id;

        onScreenshotAccept(imageId);
    };

    handleScreenUndo = (event) => {
        event.preventDefault();

        this.props.onScreenshotUndo();
    };

    render() {
        const {actions, view, images, stateNameImageIds, retryIndex,
            showMeta, onClose, onRetryChange, onShowMeta, onCommitChanges,
            totalImages, acceptedImages, staticImageAccepter
        } = this.props;
        const resultIds = uniqBy(images, 'id').map((image) => image.parentId);
        const isArrowControlDisabed = stateNameImageIds.length <= 1;
        const staticAccepterDelayedImages = staticImageAccepter.accepterDelayedImages.length;
        const imagesToCommitCount = staticImageAccepter.imagesToCommitCount + staticAccepterDelayedImages;
        const isUndoEnabled = staticImageAccepter.enabled
            ? Boolean(staticImageAccepter.accepterDelayedImages.length)
            : Boolean(acceptedImages);

        return (
            <Fragment>
                <GlobalHotKeys keyMap={this._keyMap} handlers={this._keyHandlers} />
                <header className="screenshot-accepter__header container">
                    <div className="screenshot-accepter__controls state-controls">
                        <ControlButton
                            label={<ArrowUp />}
                            title="Show previous image (↑,w)"
                            isSuiteControl={true}
                            isDisabled={isArrowControlDisabed}
                            extendClassNames="screenshot-accepter__arrow-up-btn"
                            handler={this.handlePrevScreenshot}
                        />
                        <ControlButton
                            label={<ArrowDown />}
                            title="Show next image (↓,s)"
                            isSuiteControl={true}
                            isDisabled={isArrowControlDisabed}
                            extendClassNames="screenshot-accepter__arrow-down-btn"
                            handler={this.handleNextScreenshot}
                        />
                        <ControlButton
                            label={
                                <Fragment>
                                    <Check/>
                                    Accept
                                </Fragment>
                            }
                            title="Accept image (Space,Enter)"
                            isSuiteControl={true}
                            isDisabled={images.length === 0}
                            extendClassNames="screenshot-accepter__accept-btn"
                            handler={this.handleScreenshotAccept}
                            dataTestId="screenshot-accepter-accept"
                        />
                        <ControlButton
                            label={
                                <Fragment>
                                    <ArrowUturnCcwDown/>
                                    Undo
                                </Fragment>
                            }
                            title="Revert last updated screenshot"
                            isDisabled={!isUndoEnabled}
                            isSuiteControl={true}
                            extendClassNames="screenshot-accepter__undo-btn"
                            handler={this.handleScreenUndo}
                            dataTestId="screenshot-accepter-undo"
                        />
                        <ControlButton
                            label="Show meta"
                            title="Show test meta info"
                            isActive={showMeta}
                            isDisabled={images.length === 0}
                            isSuiteControl={true}
                            extendClassNames="screenshot-accepter__show-meta-btn"
                            handler={onShowMeta}
                        />
                        <ControlSelect
                            size="m"
                            label="Diff mode"
                            value={view.diffMode}
                            handler={diffModeId => actions.setDiffMode({diffModeId})}
                            options = {Object.values(DiffModes).map((dm) => {
                                return {value: dm.id, content: dm.title};
                            })}
                            extendClassNames="screenshot-accepter__diff-mode-select"
                        />
                        <RetrySwitcher
                            title="Switch to selected attempt (left: ←,a; right: →,d)"
                            resultIds={resultIds}
                            retryIndex={retryIndex}
                            onChange={onRetryChange}
                        />
                        <ControlButton
                            label={<Fragment>
                                <ChevronsExpandUpRight />
                                Switch accept mode
                            </Fragment>}
                            title="Close mode with fast screenshot accepting (Escape)"
                            isSuiteControl={true}
                            extendClassNames="screenshot-accepter__arrows-close-btn"
                            handler={onClose}
                            dataTestId="screenshot-accepter-switch-accept-mode"
                        />
                        {staticImageAccepter.enabled && <ControlButton
                            label={`Commit ${imagesToCommitCount} images`}
                            title="Send request with imagesInfo to 'staticImageAccepter.serviceUrl'"
                            isDisabled={imagesToCommitCount === 0}
                            isSuiteControl={true}
                            handler={onCommitChanges}
                        />}
                        <ProgressBar done={acceptedImages} total={totalImages} dataTestId="screenshot-accepter-progress-bar"/>
                    </div>
                </header>
            </Fragment>
        );
    }
}

function getPrevIndex(currIndex, arrLength) {
    return currIndex > 0 ? currIndex - 1 : arrLength - 1;
}

function getNextIndex(currIndex, arrLength) {
    return currIndex < arrLength - 1 ? currIndex + 1 : 0;
}
