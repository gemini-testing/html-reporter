import {get} from 'lodash';
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
import ArrowsOpen from '../icons/arrows-open';
import {types as modalTypes} from '../modals';
import {isAcceptable, isNodeSuccessful} from '../../modules/utils';
import {isSuccessStatus, isFailStatus, isErroredStatus, isUpdatedStatus, isIdleStatus} from '../../../common-utils';

class State extends Component {
    static propTypes = {
        result: PropTypes.shape({
            status: PropTypes.string.isRequired,
            error: PropTypes.object
        }).isRequired,
        imageId: PropTypes.string,
        // from store
        gui: PropTypes.bool.isRequired,
        image: PropTypes.shape({
            status: PropTypes.string,
            error: PropTypes.object,
            stateName: PropTypes.string,
            expectedImg: PropTypes.object
        }).isRequired,
        shouldImageBeOpened: PropTypes.bool.isRequired,
        isScreenshotAccepterDisabled: PropTypes.bool.isRequired
    }

    toggleModal = () => {
        const {actions, image} = this.props;

        actions.openModal({
            id: modalTypes.SCREENSHOT_ACCEPTER,
            type: modalTypes.SCREENSHOT_ACCEPTER,
            className: 'screenshot-accepter',
            data: {image}
        });
    }

    onToggleStateResult = () => {
        const {imageId, image, shouldImageBeOpened} = this.props;

        if (!image.stateName) {
            return;
        }

        this.props.actions.toggleStateResult({imageId, shouldBeOpened: !shouldImageBeOpened});
    }

    onTestAccept = () => {
        this.props.actions.acceptTest(this.props.imageId);
    }

    _drawControlButtons() {
        if (!this.props.gui) {
            return null;
        }

        const {node, imageId, result, isScreenshotAccepterDisabled} = this.props;
        const isAcceptDisabled = !isAcceptable(node);
        const isFindSameDiffDisabled = !isFailStatus(node.status);

        if (isAcceptDisabled && isFindSameDiffDisabled && isScreenshotAccepterDisabled) {
            return null;
        }

        return (
            <div className="state-controls">
                <ControlButton
                    label="✔ Accept"
                    isSuiteControl={true}
                    isDisabled={isAcceptDisabled}
                    handler={this.onTestAccept}
                />
                <FindSameDiffsButton
                    imageId={imageId}
                    browserId={result.parentId}
                    isDisabled={isFindSameDiffDisabled}
                />
                <ControlButton
                    label={<Fragment>
                        <ArrowsOpen />
                        Switch accept mode
                    </Fragment>}
                    title="Open mode with fast screenshot accepting"
                    isSuiteControl={true}
                    isDisabled={isScreenshotAccepterDisabled}
                    extendClassNames="screenshot-accepter__arrows-open-btn"
                    handler={() => this.toggleModal()}
                />
            </div>
        );
    }

    _getStateTitle() {
        const {image, shouldImageBeOpened} = this.props;

        if (!image.stateName) {
            return null;
        }

        const className = classNames(
            'state-title',
            {'state-title_collapsed': !shouldImageBeOpened},
            `state-title_${image.status}`
        );

        return <div className={className} onClick={this.onToggleStateResult}>{image.stateName}</div>;
    }

    render() {
        if (!this.props.shouldImageBeOpened) {
            return (
                <Fragment>
                    <hr className="tab__separator" />
                    {this._getStateTitle()}
                </Fragment>
            );
        }

        const {node, result, image} = this.props;
        const {status, error} = node;
        let elem = null;

        if (isErroredStatus(status)) {
            elem = <StateError result={result} image={image} />;
        } else if (isSuccessStatus(status) || isUpdatedStatus(status) || (isIdleStatus(status) && get(image.expectedImg, 'path'))) {
            elem = <StateSuccess status={status} expectedImg={image.expectedImg} />;
        } else if (isFailStatus(status)) {
            elem = error
                ? <StateError result={result} image={image} />
                : <StateFail image={image} />;
        }

        return (
            <Fragment>
                <hr className="tab__separator"/>
                {this._getStateTitle()}
                {this._drawControlButtons()}
                {elem ? <div className='image-box__container'>{elem}</div> : null}
            </Fragment>
        );
    }
}

export default connect(
    () => {
        const getLastImageByStateName = mkGetLastImageByStateName();

        return (state, {imageId, result}) => {
            const {gui, tree} = state;
            const image = tree.images.byId[imageId] || {};
            const shouldImageBeOpened = image.stateName ? tree.images.stateById[imageId].shouldBeOpened : true;
            const node = imageId ? image : result;
            let isScreenshotAccepterDisabled = true;

            if (gui && imageId) {
                const lastImage = getLastImageByStateName(state, {imageId}) || {};
                isScreenshotAccepterDisabled = isNodeSuccessful(lastImage) || !isAcceptable(node);
            }

            return {
                gui,
                image,
                node,
                shouldImageBeOpened,
                isScreenshotAccepterDisabled
            };
        };
    },
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(State);
