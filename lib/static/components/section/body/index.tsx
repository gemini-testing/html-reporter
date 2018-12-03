'use strict';

import _ from 'lodash';
import React, {Component, ComponentState} from 'react';
import {connect} from 'react-redux';
import {bindActionCreators, Dispatch} from 'redux';
import SwitcherStyle from '../switcher-style';
import SwitcherRetry from '../switcher-retry';
import ControlButton from '../../controls/button';
import State from '../../state';
import MetaInfo from './meta-info';
import Description from './description';
import {isSuccessStatus, isErroredStatus} from '../../../../common-utils';

const actions = require('../../../modules/actions');

interface IBodyProps extends React.Props<any>{
    result: any;
    retries?: any;
    suite?: {};
    gui?: boolean;
    running?: boolean;
    actions?: any;
}

interface IBodyStates extends ComponentState{
    color: number;
    retry: number;
}

class Body extends Component<IBodyProps, IBodyStates> {

    static defaultProps: Partial<IBodyProps> = {
        retries: []
    };

    constructor(props: IBodyProps, state: IBodyStates) {
        super(props, state);

        this.state = {
            color: 1,
            retry: this.props.retries.length
        };
        this.onSwitcherStyleChange.bind(this);
        this.onSwitcherRetryChange.bind(this);
        this.onTestRetry.bind(this);
        this.onTestAccept.bind(this);
    }

    onSwitcherStyleChange = (index: number) => {
        this.setState({color: index});
    }

    onSwitcherRetryChange = (index: number) => {
        this.setState({retry: index});
    }

    onTestAccept = (stateName: any) => {
        const {result, suite} = this.props;

        this.props.actions.acceptTest(suite, result.name, this.state.retry, stateName);
    }

    onTestRetry = () => {
        const {result, suite} = this.props;

        this.props.actions.retryTest(suite, result.name);
    }

    private _addRetryButton = () => {
        const {gui, running} = this.props;

        return gui
            ? (
                <div className='controls__item'>
                    <ControlButton
                        label='↻ Retry'
                        isSuiteControl={true}
                        isDisabled={running}
                        handler={this.onTestRetry}
                    />
                </div>
            )
            : null;
    }

    private _getActiveResult = () => {
        const {result, retries} = this.props;

        return retries.concat(result)[this.state.retry];
    }

    private _getTabs() {
        const activeResult = this._getActiveResult();

        if (_.isEmpty(activeResult.imagesInfo)) {
            return isSuccessStatus(activeResult.status) ? null : this._drawTab(activeResult);
        }

        const tabs = activeResult.imagesInfo.map((imageInfo: any, idx: number) => {
            const {stateName} = imageInfo;
            const reason = imageInfo.reason || activeResult.reason;
            const state = Object.assign({image: true, reason}, imageInfo);

            return this._drawTab(state, stateName || idx);
        });

        return this._shouldAddErrorTab(activeResult)
            ? tabs.concat(this._drawTab(activeResult))
            : tabs;
    }

    private _drawTab(state: any, key: string = '') {
        return (
            <div key={key} className='tab'>
                <div className='tab__item tab__item_active'>
                    <State state={state} acceptHandler={this.onTestAccept} />
                </div>
            </div>
        );
    }

    private _shouldAddErrorTab({multipleTabs, status, screenshot}:
                           {multipleTabs: boolean, status: string, screenshot: boolean}) {
        return multipleTabs && isErroredStatus(status) && !screenshot;
    }

    render() {
        const {retries} = this.props;
        const activeResult = this._getActiveResult();
        const {metaInfo, suiteUrl, description} = activeResult;

        return (
            <div className='section__body'>
                <div className={`image-box cswitcher_color_${this.state.color}`}>
                    <div className='controls'>
                        <div className='controls__item'>
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

export default connect<{}, {}, IBodyProps>(
    (state: any) => ({gui: state.gui, running: state.running}),
    (dispatch: Dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(Body);
