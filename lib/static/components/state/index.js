'use strict';

import {get} from 'lodash';
import React, {Component, Fragment} from 'react';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import StateError from './state-error';
import StateSuccess from './state-success';
import StateFail from './state-fail';
import ControlButton from '../controls/control-button';
import {isAcceptable} from '../../modules/utils';
import {isSuccessStatus, isFailStatus, isErroredStatus, isUpdatedStatus, isIdleStatus} from '../../../common-utils';

class State extends Component {
    static propTypes = {
        state: PropTypes.shape({
            status: PropTypes.string,
            expectedImg: PropTypes.object,
            actualImg: PropTypes.object,
            diffImg: PropTypes.object
        }),
        image: PropTypes.bool,
        error: PropTypes.object,
        acceptHandler: PropTypes.func,
        toggleHandler: PropTypes.func,
        gui: PropTypes.bool,
        scaleImages: PropTypes.bool,
        expand: PropTypes.string
    }

    constructor(props) {
        super(props);
        const {state: {stateName}, toggleHandler} = this.props;

        toggleHandler({stateName, opened: this._shouldBeOpened()});
        this.state = {opened: stateName ? this.props.state.opened : true};
    }

    _shouldBeOpened() {
        const {expand} = this.props;
        const {status} = this.props.state;

        if ((expand === 'errors' || expand === 'retries') && (isFailStatus(status) || isErroredStatus(status))) {
            return true;
        } else if (expand === 'all') {
            return true;
        }

        return false;
    }

    _getAcceptButton() {
        if (!this.props.gui) {
            return null;
        }

        const {state, state: {stateName}, acceptHandler} = this.props;
        const isAcceptDisabled = !isAcceptable(state);
        const acceptFn = () => acceptHandler(stateName);

        return (
            <ControlButton
                label="✔ Accept"
                isSuiteControl={true}
                isDisabled={isAcceptDisabled}
                handler={acceptFn}
            />
        );
    }

    _toggleState = () => {
        const {state: {stateName, opened}, toggleHandler} = this.props;

        toggleHandler({stateName, opened: !opened});
        this.setState({opened: this.props.state.opened});
    }

    _getStateTitle(stateName, status) {
        const className = classNames(
            'state-title',
            {'state-title_collapsed': !this.state.opened},
            `state-title_${status}`
        );

        return stateName
            ? <div className={className} onClick={this._toggleState}>{stateName}</div>
            : null;
    }

    render() {
        const {status, expectedImg, actualImg, diffImg, stateName, diffClusters} = this.props.state;
        const {image, error} = this.props;
        let elem = null;

        if (!this.state.opened) {
            return (
                <Fragment>
                    <hr/>
                    {this._getStateTitle(stateName, status)}
                </Fragment>
            );
        }

        if (isErroredStatus(status)) {
            elem = <StateError image={Boolean(image)} actualImg={actualImg} error={error}/>;
        } else if (isSuccessStatus(status) || isUpdatedStatus(status) || (isIdleStatus(status) && get(expectedImg, 'path'))) {
            elem = <StateSuccess status={status} expectedImg={expectedImg} />;
        } else if (isFailStatus(status)) {
            elem = error
                ? <StateError image={Boolean(image)} actualImg={actualImg} error={error}/>
                : <StateFail expectedImg={expectedImg} actualImg={actualImg} diffImg={diffImg} diffClusters={diffClusters}/>;
        }

        const className = classNames(
            'image-box__container',
            {'image-box__container_scale': this.props.scaleImages}
        );

        return (
            <Fragment>
                <hr/>
                {this._getStateTitle(stateName, status)}
                {this._getAcceptButton()}
                <div className={className}>{elem}</div>
            </Fragment>
        );
    }
}

export default connect(
    ({gui, view: {expand, scaleImages}}) => ({gui, expand, scaleImages})
)(State);
