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

        this.onSwitcherStyleChange = this.onSwitcherStyleChange.bind(this);
        this.onSwitcherRetryChange = this.onSwitcherRetryChange.bind(this);
        this.onSuiteAccept = this.onSuiteAccept.bind(this);
        this.onSuiteRetry = this.onSuiteRetry.bind(this);
    }

    onSwitcherStyleChange(index) {
        this.setState({color: index});
    }

    onSwitcherRetryChange(index) {
        this.setState({retry: index});
    }

    onSuiteAccept() {
        const {result, suite} = this.props;

        this.props.actions.acceptSuite(suite, result.name);
    }

    onSuiteRetry() {
        const {result, suite} = this.props;

        this.props.actions.retrySuite(suite, result.name);
    }

    _addExtraButtons() {
        const {result: {status}, gui, running} = this.props;
        const retryDisabled = running || isSuccessStatus(status) || (!isFailStatus(status) && !isErroredStatus(status));

        return gui
            ? (
                <div className="controls__item">
                    <ControlButton
                        label="✔ Accept"
                        isSuiteControl={true}
                        isDisabled={!isFailStatus(status)}
                        handler={this.onSuiteAccept}
                    />
                    <ControlButton
                        label="↻ Retry"
                        isSuiteControl={true}
                        isDisabled={retryDisabled}
                        handler={this.onSuiteRetry}
                    />
                </div>
            )
            : null;
    }

    render() {
        const {result, retries} = this.props;
        const active = retries
            .concat(result)
            .filter((attempt, index) => index === this.state.retry)[0];

        return (
            <div className="section__body">
                <div className={`image-box cswitcher_color_${this.state.color}`}>
                    <div className="controls">
                        <div className="controls__item">
                            <SwitcherStyle onChange={this.onSwitcherStyleChange}/>
                            <SwitcherRetry onChange={this.onSwitcherRetryChange} retries={retries}/>
                        </div>
                        {this._addExtraButtons()}
                    </div>
                    <div className="tab">
                        <div className="tab__item tab__item_active">
                            <State state={active}/>
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
