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
        actions.acceptSuite(this.props.suite);
    }

    onSuiteRetry() {
        actions.retrySuite(this.props.suite);
    }

    _addExtraButtons() {
        const {result, gui} = this.props;
        return gui
            ? (
                <div className="controls__item">
                    <ControlButton label="✔ Accept"
                        isDisabled={!result.fail}
                        handler={this.onSuiteAccept}
                    />
                    <ControlButton label="↻ Retry"
                        isDisabled={!result.fail || !result.error || result.success}
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
    (state) => ({gui: state.gui}),
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(SectionBrowserBody);
