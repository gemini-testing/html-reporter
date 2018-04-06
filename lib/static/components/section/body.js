'use strict';

import React, {Component} from 'react';
import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';
import PropTypes from 'prop-types';
import SwitcherStyle from './switcher-style';
import SwitcherRetry from './switcher-retry';
import ControlButton from '../controls/button';
import State from '../state';
import * as actions from '../../modules/actions';
import {isSuccessStatus, isFailStatus, isErroredStatus} from '../../../common-utils';
import {getCommonErrors} from '../../../constants/errors';

const {NO_REF_IMAGE_ERROR} = getCommonErrors();

class SectionBrowserBody extends Component {
    static propTypes = {
        result: PropTypes.object.isRequired,
        retries: PropTypes.array
    }

    static defaultProps = {
        retries: []
    }

    constructor(props) {
        super(props);

        this.state = {
            color: 1,
            retry: this.props.retries.length
        };
    }

    onSwitcherStyleChange = (index) => {
        this.setState({color: index});
    }

    onSwitcherRetryChange = (index) => {
        this.setState({retry: index});
    }

    onTestAccept = () => {
        const {result, suite} = this.props;

        this.props.actions.acceptTest(suite, result.name, this.state.retry);
    }

    onTestRetry = () => {
        const {result, suite} = this.props;

        this.props.actions.retryTest(suite, result.name);
    }

    _addExtraButtons(activeResult) {
        const {gui, running} = this.props;
        const {status, reason} = activeResult;
        const stack = reason && reason.stack;
        const acceptDisabled = !(isErroredStatus(status) && stack.startsWith(NO_REF_IMAGE_ERROR) || isFailStatus(status));
        const retryDisabled = running || isSuccessStatus(status) || (!isFailStatus(status) && !isErroredStatus(status));

        return gui
            ? (
                <div className="controls__item">
                    <ControlButton
                        label="✔ Accept"
                        isSuiteControl={true}
                        isDisabled={acceptDisabled}
                        handler={this.onTestAccept}
                    />
                    <ControlButton
                        label="↻ Retry"
                        isSuiteControl={true}
                        isDisabled={retryDisabled}
                        handler={this.onTestRetry}
                    />
                </div>
            )
            : null;
    }

    _getActiveResult = () => {
        const {result, retries} = this.props;

        return retries.concat(result)[this.state.retry];
    }

    render() {
        const {retries} = this.props;
        const activeResult = this._getActiveResult();

        return (
            <div className="section__body">
                <div className={`image-box cswitcher_color_${this.state.color}`}>
                    <div className="controls">
                        <div className="controls__item">
                            <SwitcherStyle onChange={this.onSwitcherStyleChange}/>
                            <SwitcherRetry onChange={this.onSwitcherRetryChange} retries={retries}/>
                        </div>
                        {this._addExtraButtons(activeResult)}
                    </div>
                    <div className="tab">
                        <div className="tab__item tab__item_active">
                            <State state={activeResult}/>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

export default connect(
    (state) => ({gui: state.gui, running: state.running}),
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(SectionBrowserBody);
