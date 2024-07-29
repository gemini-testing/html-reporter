import {get, last} from 'lodash';
import React, {Component, Fragment} from 'react';
import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import * as actions from '../../modules/actions';
import {mkGetLastImageByStateName} from '../../modules/selectors/tree';
import StateError from './state-error';
import StateSuccess from './state-success';
import StateFail from './state-fail';
import ControlButton from '../controls/control-button';
import FindSameDiffsButton from '../controls/find-same-diffs-button';
import {types as modalTypes} from '../modals';
import {isAcceptable, isNodeStaged, isNodeSuccessful, isScreenRevertable} from '../../modules/utils';
import {isSuccessStatus, isFailStatus, isErrorStatus, isUpdatedStatus, isIdleStatus, isStagedStatus, isCommitedStatus} from '../../../common-utils';
import {Disclosure} from '@gravity-ui/uikit';
import {ChevronsExpandUpRight, Check, ArrowUturnCcwDown} from '@gravity-ui/icons';

class State extends Component {
    static propTypes = {
        result: PropTypes.shape({
            status: PropTypes.string.isRequired,
            error: PropTypes.object,
            parentId: PropTypes.string
        }).isRequired,
        imageId: PropTypes.string,
        // from store
        gui: PropTypes.bool.isRequired,
        image: PropTypes.shape({
            status: PropTypes.string,
            error: PropTypes.object,
            stateName: PropTypes.string,
            expectedImg: PropTypes.object,
            actualImg: PropTypes.object,
            diffRatio: PropTypes.number,
            differentPixels: PropTypes.number
        }).isRequired,
        node: PropTypes.shape({
            error: PropTypes.object,
            status: PropTypes.string
        }),
        shouldImageBeOpened: PropTypes.bool.isRequired,
        isScreenshotAccepterDisabled: PropTypes.bool.isRequired,
        isStaticImageAccepterEnabled: PropTypes.bool.isRequired,
        isStaticAccepterAcceptDisabled: PropTypes.bool,
        isLastResult: PropTypes.bool.isRequired,
        actions: PropTypes.object.isRequired
    };

    toggleModal = () => {
        const {actions, image} = this.props;

        actions.openModal({
            id: modalTypes.SCREENSHOT_ACCEPTER,
            type: modalTypes.SCREENSHOT_ACCEPTER,
            className: 'screenshot-accepter',
            data: {image}
        });
    };

    onToggleStateResult = () => {
        const {imageId, image, shouldImageBeOpened} = this.props;

        if (!image.stateName) {
            return;
        }

        this.props.actions.toggleStateResult({imageId, shouldBeOpened: !shouldImageBeOpened});
    };

    onTestAccept = () => {
        if (this.props.isStaticImageAccepterEnabled) {
            this.props.actions.staticAccepterStageScreenshot([this.props.imageId]);
        } else {
            this.props.actions.acceptTest(this.props.imageId);
        }
    };

    onScreenshotUndo = () => {
        if (this.props.isStaticImageAccepterEnabled) {
            this.props.actions.staticAccepterUnstageScreenshot(this.props.imageId);
        } else {
            this.props.actions.undoAcceptImage(this.props.imageId);
        }
    };

    _drawFailImageControls() {
        if (!this.props.gui && !this.props.isStaticImageAccepterEnabled) {
            return null;
        }

        const {node, imageId, result, isScreenshotAccepterDisabled, isStaticImageAccepterEnabled, isStaticAccepterAcceptDisabled} = this.props;
        const isAcceptDisabled = !isAcceptable(node) || (isStaticImageAccepterEnabled && isStaticAccepterAcceptDisabled);
        const isFindSameDiffDisabled = !isFailStatus(node.status) || isStaticImageAccepterEnabled;

        if (isAcceptDisabled && isFindSameDiffDisabled && isScreenshotAccepterDisabled) {
            return null;
        }

        return (
            <div className="state-controls">
                <ControlButton
                    label={<Fragment>
                        <Check/>
                        Accept
                    </Fragment>}
                    isSuiteControl={true}
                    isDisabled={isAcceptDisabled}
                    handler={this.onTestAccept}
                    dataTestId={'test-accept'}
                />
                <FindSameDiffsButton
                    imageId={imageId}
                    browserId={result.parentId}
                    isDisabled={isFindSameDiffDisabled}
                />
                <ControlButton
                    label={<Fragment>
                        <ChevronsExpandUpRight />
                        Switch accept mode
                    </Fragment>}
                    title="Open mode with fast screenshot accepting"
                    isSuiteControl={true}
                    isDisabled={isScreenshotAccepterDisabled}
                    extendClassNames="screenshot-accepter__arrows-open-btn"
                    handler={() => this.toggleModal()}
                    data-qa="test-switch-accept-mode"
                />
            </div>
        );
    }

    _drawUpdatedImageControls() {
        const {gui, image, isLastResult, isStaticImageAccepterEnabled} = this.props;

        if (!isScreenRevertable({image, gui, isLastResult, isStaticImageAccepterEnabled})) {
            return null;
        }

        return (
            <div className="state-controls">
                <ControlButton
                    label={
                        <Fragment>
                            <ArrowUturnCcwDown/>
                            Undo
                        </Fragment>
                    }
                    isSuiteControl={true}
                    handler={this.onScreenshotUndo}
                    dataTestId={'test-undo'}
                />
            </div>
        );
    }

    _getDisplayedDiffPercentValue() {
        const percent = this.props.image.diffRatio * 100;
        const percentRounded = Math.ceil(percent * 100) / 100;
        const percentThreshold = 0.01;

        if (percent < percentThreshold) {
            return `< ${percentThreshold}`;
        }

        return String(percentRounded);
    }

    _getStateTitleWithDiffCount() {
        const {image} = this.props;

        if (!image.stateName) {
            return null;
        }

        const className = classNames(
            'state-title',
            `state-title_${image.status}`
        );

        let displayedText = image.stateName;

        if (image.differentPixels && image.diffRatio) {
            const displayedDiffPercent = this._getDisplayedDiffPercentValue();

            displayedText += ` (diff: ${image.differentPixels}px, ${displayedDiffPercent}%)`;
        }

        return <div className={className}>{displayedText}</div>;
    }

    render() {
        const {node, result, image} = this.props;
        const {status, error} = node;
        let elem = null;

        if (isErrorStatus(status)) {
            elem = <StateError result={result} image={image} />;
        } else if (isSuccessStatus(status) || isUpdatedStatus(status) || (isIdleStatus(status) && get(image.expectedImg, 'path'))) {
            elem = <StateSuccess status={status} expectedImg={image.expectedImg} />;
        } else if (isStagedStatus(status) || isCommitedStatus(status)) {
            elem = <StateSuccess status={status} expectedImg={image.actualImg} />;
        } else if (isFailStatus(status)) {
            elem = error
                ? <StateError result={result} image={image} />
                : <StateFail image={image} />;
        }

        return (
            <Fragment>
                <hr className="tab__separator"/>
                {this._getStateTitleWithDiffCount() ? <Disclosure summary={this._getStateTitleWithDiffCount()}
                    onUpdate={this.onToggleStateResult} size='l' defaultExpanded={this.props.shouldImageBeOpened}>
                    {this._drawFailImageControls()}
                    {this._drawUpdatedImageControls()}
                    {elem ? <div className='image-box__container'>{elem}</div> : null}
                </Disclosure> : <Fragment>
                    {this._drawFailImageControls()}
                    {this._drawUpdatedImageControls()}
                    {elem ? <div className='image-box__container'>{elem}</div> : null}
                </Fragment>}
            </Fragment>
        );
    }
}

export default connect(
    () => {
        const getLastImageByStateName = mkGetLastImageByStateName();

        return (state, {imageId, result}) => {
            const {gui, tree} = state;
            const isStaticImageAccepterEnabled = state.staticImageAccepter.enabled;
            const image = tree.images.byId[imageId] || {};
            const shouldImageBeOpened = image.stateName ? tree.images.stateById[imageId].shouldBeOpened : true;
            const node = imageId ? image : result;
            const browser = state.tree.browsers.byId[result.parentId];
            const isLastResult = last(browser.resultIds) === result.id;
            let isScreenshotAccepterDisabled = true;
            let isStaticAccepterAcceptDisabled = true;

            if ((gui || isStaticImageAccepterEnabled) && imageId) {
                const lastImage = getLastImageByStateName(state, {imageId}) || {};
                isScreenshotAccepterDisabled = isNodeSuccessful(lastImage) || !isAcceptable(node);
                isStaticAccepterAcceptDisabled = (isNodeSuccessful(lastImage) && !isNodeStaged(lastImage)) || !isAcceptable(node);
            }

            return {
                gui,
                image,
                node,
                shouldImageBeOpened,
                isScreenshotAccepterDisabled,
                isStaticImageAccepterEnabled,
                isStaticAccepterAcceptDisabled,
                isLastResult
            };
        };
    },
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(State);
