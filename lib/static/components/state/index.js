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
import {isAcceptable, isNodeFailed, isNodeSuccessful} from '../../modules/utils';
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
        expand: PropTypes.string.isRequired,
        scaleImages: PropTypes.bool.isRequired,
        closeIds: PropTypes.array,
        serverStopped: PropTypes.bool.isRequired,
        image: PropTypes.shape({
            status: PropTypes.string,
            error: PropTypes.object,
            stateName: PropTypes.string,
            expectedImg: PropTypes.object
        }).isRequired,
        imageOpened: PropTypes.bool,
        isScreenshotAccepterDisabled: PropTypes.bool.isRequired
    }

    static defaultProps = {
        image: {}
    };

    constructor(props) {
        super(props);

        const opened = this.props.image.stateName ? this._shouldBeOpened() : true;
        this.state = {opened};
    }

    componentDidMount() {
        this.onToggleStateResult({opened: this.state.opened});
    }

    // eslint-disable-next-line camelcase
    UNSAFE_componentWillReceiveProps(nextProps) {
        if (nextProps.closeIds === this.props.closeIds || !this.state.opened) {
            return;
        }

        if (nextProps.expand !== this.props.expand) {
            const opened = this._shouldBeOpened(nextProps);

            if (this.state.opened !== opened) {
                this.setState({opened});
                this.onToggleStateResult({opened});
            }
        }

        const {imageId} = this.props;
        const opened = !nextProps.closeIds.includes(imageId);

        if (opened !== this.state.opened) {
            this.setState({opened});
            this.onToggleStateResult({opened});
        }
    }

    componentWillUnmount() {
        this.onToggleStateResult({opened: false});
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

    onToggleStateResult = ({opened, isUserClick = false}) => {
        const {imageId, image, imageOpened} = this.props;

        if (!image.stateName || imageOpened === opened) {
            return;
        }

        this.props.actions.toggleStateResult({imageId, opened, isUserClick});
    }

    onTestAccept = () => {
        this.props.actions.acceptTest(this.props.imageId);
    }

    _initOpened() {
        return this.props.image.stateName ? this._shouldBeOpened() : true;
    }

    _shouldBeOpened(props = this.props) {
        const {expand, node} = props;

        if ((expand === 'errors' || expand === 'retries') && isNodeFailed(node)) {
            return true;
        } else if (expand === 'all') {
            return true;
        }

        return false;
    }

    _drawControlButtons() {
        if (!this.props.gui) {
            return null;
        }

        const {node, imageId, result, isScreenshotAccepterDisabled, serverStopped} = this.props;
        const isAcceptDisabled = !isAcceptable(node) || serverStopped;
        const isFindSameDiffDisabled = !isFailStatus(node.status) || serverStopped;

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

    _toggleState = () => {
        this.setState({opened: !this.state.opened});
        this.onToggleStateResult({opened: !this.state.opened, isUserClick: true});
    }

    _getStateTitle() {
        const {image, imageOpened} = this.props;

        if (!image.stateName) {
            return null;
        }

        const className = classNames(
            'state-title',
            {'state-title_collapsed': !imageOpened},
            `state-title_${image.status}`
        );

        return <div className={className} onClick={this._toggleState}>{image.stateName}</div>;
    }

    render() {
        if (!this.state.opened) {
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

        const className = classNames(
            'image-box__container',
            {'image-box__container_scale': this.props.scaleImages}
        );

        return (
            <Fragment>
                <hr className="tab__separator"/>
                {this._getStateTitle()}
                {this._drawControlButtons()}
                {elem ? <div className={className}>{elem}</div> : null}
            </Fragment>
        );
    }
}

export default connect(
    () => {
        const getLastImageByStateName = mkGetLastImageByStateName();

        return (state, {imageId, result}) => {
            const {gui, tree, view: {expand, scaleImages}, closeIds, serverStopped} = state;
            const image = tree.images.byId[imageId];
            const {opened} = tree.images.stateById[imageId] || {};
            const node = imageId ? image : result;
            let isScreenshotAccepterDisabled = true;

            if (gui && imageId) {
                const lastImage = getLastImageByStateName(state, {imageId}) || {};
                isScreenshotAccepterDisabled = isNodeSuccessful(lastImage) || !isAcceptable(node);
            }

            return {
                gui,
                expand,
                scaleImages,
                closeIds,
                serverStopped,
                image,
                node,
                imageOpened: opened,
                isScreenshotAccepterDisabled
            };
        };
    },
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(State);
