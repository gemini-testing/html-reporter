'use strict';

import React, {Component, Fragment} from 'react';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import StateError from './state-error';
import StateSuccess from './state-success';
import StateFail from './state-fail';
import ControlButton from '../controls/button';
import {isAcceptable} from '../../modules/utils';
import {isSuccessStatus, isFailStatus, isErroredStatus, isUpdatedStatus, isIdleStatus} from '../../../common-utils';

class State extends Component {
    static propTypes = {
        state: PropTypes.shape({
            status: PropTypes.string,
            image: PropTypes.bool,
            reason: PropTypes.object,
            expectedPath: PropTypes.string,
            actualPath: PropTypes.string,
            diffPath: PropTypes.string
        }),
        acceptHandler: PropTypes.func,

        gui: PropTypes.bool,
        scaleImages: PropTypes.bool
    }

    _getAcceptButton() {
        if (!this.props.gui) {
            return null;
        }

        const {state, acceptHandler} = this.props;
        const isAcceptDisabled = !isAcceptable(state);

        return (
            <ControlButton
                label="✔ Accept"
                isSuiteControl={true}
                isDisabled={isAcceptDisabled}
                handler={acceptHandler}
            />
        );
    }

    render() {
        const {status, reason, image, expectedPath, actualPath, diffPath} = this.props.state;

        let elem = null;

        if (isErroredStatus(status)) {
            elem = <StateError image={Boolean(image)} actual={actualPath} reason={reason}/>;
        } else if (isSuccessStatus(status) || isUpdatedStatus(status) || (isIdleStatus(status) && expectedPath)) {
            elem = <StateSuccess status={status} expected={expectedPath} />;
        } else if (isFailStatus(status)) {
            elem = reason
                ? <StateError image={true} actual={actualPath} reason={reason}/>
                : <StateFail expected={expectedPath} actual={actualPath} diff={diffPath}/>;
        }

        const className = classNames(
            'image-box__container',
            {'image-box__container_scale': this.props.scaleImages}
        );

        return (
            <Fragment>
                <hr/>
                {this._getAcceptButton()}
                <div className={className}>{elem}</div>
            </Fragment>
        );
    }
}

export default connect(({gui, view: {scaleImages}}) => ({gui, scaleImages}))(State);
