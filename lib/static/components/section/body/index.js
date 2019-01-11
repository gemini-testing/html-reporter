'use strict';

import {isEmpty} from 'lodash';
import React, {Component} from 'react';
import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';
import PropTypes from 'prop-types';
import SwitcherStyle from '../switcher-style';
import SwitcherRetry from '../switcher-retry';
import ControlButton from '../../controls/button';
import State from '../../state';
import MetaInfo from './meta-info';
import Description from './description';
import * as actions from '../../../modules/actions';
import {isSuccessStatus, isErroredStatus} from '../../../../common-utils';

class Body extends Component {
    static propTypes = {
        result: PropTypes.object.isRequired,
        retries: PropTypes.array,
        suite: PropTypes.object
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

    onTestAccept = (stateName) => {
        const {result, suite} = this.props;

        this.props.actions.acceptTest(suite, result.name, this.state.retry, stateName);
    }

    onTestRetry = () => {
        const {result, suite} = this.props;

        this.props.actions.retryTest(suite, result.name);
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

        if (isEmpty(activeResult.imagesInfo)) {
            return isSuccessStatus(activeResult.status) ? null : this._drawTab(activeResult);
        }

        const tabs = activeResult.imagesInfo.map((imageInfo, idx) => {
            const {stateName} = imageInfo;
            const error = imageInfo.error || activeResult.error;
            const state = Object.assign({image: true, error}, imageInfo);

            return this._drawTab(state, stateName || idx);
        });

        return this._shouldAddErrorTab(activeResult)
            ? tabs.concat(this._drawTab(activeResult))
            : tabs;
    }

    _drawTab(state, key = '') {
        return (
            <div key={key} className="tab">
                <div className="tab__item tab__item_active">
                    <State state={state} acceptHandler={this.onTestAccept} />
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
