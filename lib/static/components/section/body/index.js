'use strict';

import {isEmpty, defaults, pick, values, mapValues, omitBy} from 'lodash';
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
            retry: this.props.retries.length
        };
    }

    componentDidMount() {
        this._toggleTestResult({opened: true});
        this._changeTestRetry({retryIndex: this.state.retry});
    }

    componentWillUnmount() {
        this._toggleTestResult({opened: false});
    }

    onSwitcherStyleChange = (index) => {
        this.setState({color: index});
    }

    onSwitcherRetryChange = (index) => {
        this.setState({retry: index});
        this._changeTestRetry({retryIndex: index});
    }

    onTestAccept = (stateName) => {
        const {result, suite} = this.props;

        this.props.actions.acceptTest(suite, result.name, stateName);
    }

    onTestFindSameDiffs = (stateName) => {
        const {suite: {suitePath}, browser, failed} = this.props;

        this.props.actions.findSameDiffs({suitePath, browser, stateName, fails: failed});
    }

    onTestRetry = () => {
        const {result, suite} = this.props;

        this.props.actions.retryTest(suite, result.name);
    }

    onToggleStateResult = ({stateName, opened}) => {
        const {result: {name: browserId}, suite: {suitePath}} = this.props;
        const retryIndex = this.state.retry;

        this.props.actions.toggleStateResult({browserId, suitePath, stateName, retryIndex, opened});
    }

    getExtraMetaInfo = () => {
        const {suite, apiValues: {extraItems, metaInfoExtenders}} = this.props;

        return omitBy(mapValues(metaInfoExtenders, (extender) => {
            const stringifiedFn = extender.startsWith('return') ? extender : `return ${extender}`;

            return new Function(stringifiedFn)()(suite, extraItems);
        }), isEmpty);
    }

    _toggleTestResult({opened}) {
        const {result: {name: browserId}, suite: {suitePath}} = this.props;

        this.props.actions.toggleTestResult({browserId, suitePath, opened});
    }

    _changeTestRetry({retryIndex}) {
        const {result: {name: browserId}, suite: {suitePath}} = this.props;

        this.props.actions.changeTestRetry({browserId, suitePath, retryIndex});
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
        const {result, retries} = this.props;

        return retries.concat(result)[this.state.retry];
    }

    _getTabs() {
        const activeResult = this._getActiveResult();
        const retryIndex = this.state.retry;

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
        opts = defaults({error: state.error}, opts);

        return (
            <div key={key} className="tab">
                <div className="tab__item tab__item_active">
                    <State
                        state={state} suitePath={suitePath} browserId={browserId}
                        acceptHandler={this.onTestAccept} toggleHandler={this.onToggleStateResult}
                        findSameDiffsHandler={this.onTestFindSameDiffs} {...opts}
                    />
                </div>
            </div>
        );
    }

    _shouldAddErrorTab({multipleTabs, status, screenshot}) {
        return multipleTabs && isErroredStatus(status) && !screenshot;
    }

    render() {
        const {retries} = this.props;
        const activeResult = this._getActiveResult();
        const {metaInfo, suiteUrl, description} = activeResult;

        return (
            <div className="section__body">
                <div className={`image-box cswitcher_color_${this.state.color}`}>
                    <div className="controls">
                        <div className="controls__item">
                            <SwitcherStyle onChange={this.onSwitcherStyleChange}/>
                            <SwitcherRetry onChange={this.onSwitcherRetryChange} retries={retries}/>
                        </div>
                        {this._addRetryButton()}
                    </div>
                    <MetaInfo metaInfo={metaInfo} suiteUrl={suiteUrl} getExtraMetaInfo={this.getExtraMetaInfo}/>
                    {description && <Description content={description}/>}
                    {this._getTabs()}
                </div>
            </div>
        );
    }
}

export default connect(
    ({gui, running, suites, suiteIds, apiValues}) => ({
        failed: values(pick(suites, suiteIds.failed)),
        gui,
        running,
        apiValues
    }),
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(Body);
