'use strict';

import {isEmpty} from 'lodash';
import React, {Component} from 'react';
import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';
import PropTypes from 'prop-types';
import SwitcherStyle from '../switcher-style';
import SwitcherRetry from '../switcher-retry';
import ControlButton from '../../controls/control-button';
import State from '../../state';
import MetaInfo from './meta-info';
import Description from './description';
import * as actions from '../../../modules/actions';
import {isSuccessStatus, isErroredStatus} from '../../../../common-utils';
import {USER} from '../../../../constants/controllers';

class Body extends Component {
    static propTypes = {
        result: PropTypes.object.isRequired,
        retries: PropTypes.array,
        suite: PropTypes.object,
        browser: PropTypes.object
    }

    static defaultProps = {
        retries: []
    }

    constructor(props) {
        super(props);

        this.state = {
            color: 1,
            retry: props.retries.length
        };

        if (!props.browser.hasOwnProperty('retriesLen') || props.browser.retriesLen < props.retries.length) {
            const retriesLen = props.retries.length;
            this._changeTestRetry({retryIndex: retriesLen, retriesLen});
        }
    }

    componentDidMount() {
        this._toggleTestResult({opened: true});
    }

    componentWillUnmount() {
        this._toggleTestResult({opened: false});
    }

    onSwitcherStyleChange = (index) => {
        this.setState({color: index});
    }

    onSwitcherRetryChange = (index) => {
        this._changeTestRetry({retryIndex: index});
        this.setState({retry: index});
    }

    onTestAccept = (stateName) => {
        const {result, suite} = this.props;

        this.props.actions.acceptTest(suite, result.name, stateName);
    }

    onTestRetry = () => {
        const {result, suite} = this.props;

        this.props.actions.retryTest(suite, result.name);
    }

    onToggleStateResult = (opts) => {
        const {result: {name: browserId}, suite: {suitePath}} = this.props;
        const {retryIndex} = this.props.browser;

        this.props.actions.toggleStateResult({browserId, suitePath, retryIndex, ...opts});
    }

    _toggleTestResult({opened}) {
        const {browser: {retryIndex}, result: {name: browserId}, suite: {suitePath}} = this.props;

        this.props.actions.toggleTestResult({browserId, suitePath, opened, retryIndex});
    }

    _changeTestRetry(opts) {
        const {result: {name: browserId}, suite: {suitePath}} = this.props;

        this.props.actions.changeTestRetry({browserId, suitePath, ...opts});
    }

    _addRetryButton = () => {
        const {gui, running} = this.props;

        return gui
            ? (
                <div className="controls__item">
                    <ControlButton
                        label="↻ Retry"
                        isSuiteControl={true}
                        isDisabled={running}
                        handler={this.onTestRetry}
                    />
                </div>
            )
            : null;
    }

    _getActiveResult = () => {
        const {result, retries, browser} = this.props;

        return retries.concat(result)[browser.retryIndex];
    }

    _getTabs() {
        const activeResult = this._getActiveResult();
        const {retryIndex} = this.props.browser;

        if (isEmpty(activeResult.imagesInfo)) {
            return isSuccessStatus(activeResult.status) ? null : this._drawTab(activeResult);
        }

        const tabs = activeResult.imagesInfo.map((imageInfo, idx) => {
            const {stateName} = imageInfo;
            const error = imageInfo.error || activeResult.error;

            return this._drawTab(imageInfo, `${stateName || idx}_${retryIndex}`, {image: true, error});
        });

        return this._shouldAddErrorTab(activeResult)
            ? tabs.concat(this._drawTab(activeResult))
            : tabs;
    }

    _drawTab(state, key = '', opts = {}) {
        const {result: {name: browserId}, suite: {suitePath}} = this.props;

        return (
            <div key={key} className="tab">
                <div className="tab__item tab__item_active">
                    <State
                        state={state} suitePath={suitePath} browserId={browserId}
                        acceptHandler={this.onTestAccept} toggleHandler={this.onToggleStateResult} {...opts}
                    />
                </div>
            </div>
        );
    }

    _shouldAddErrorTab({multipleTabs, status, screenshot}) {
        return multipleTabs && isErroredStatus(status) && !screenshot;
    }

    render() {
        const {retries, browser: {retryIndex}} = this.props;
        const activeResult = this._getActiveResult();
        const {metaInfo, suiteUrl, description} = activeResult;

        return (
            <div className="section__body">
                <div className={`image-box cswitcher_color_${this.state.color}`}>
                    <div className="controls">
                        <div className="controls__item">
                            <SwitcherStyle onChange={this.onSwitcherStyleChange}/>
                            <SwitcherRetry onChange={this.onSwitcherRetryChange} retries={retries} retryIndex={retryIndex}/>
                        </div>
                        {this._addRetryButton()}
                    </div>
                    <MetaInfo metaInfo={metaInfo} suiteUrl={suiteUrl}/>
                    {description && <Description content={description}/>}
                    {this._getTabs()}
                </div>
            </div>
        );
    }
}

export default connect(
    (state) => ({gui: state.gui, running: state.running}),
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(Body);
