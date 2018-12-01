'use strict';

import React, {Component} from 'react';
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import {pick, values} from 'lodash';
import * as actions from '../../modules/actions';
import CommonControls from './common-controls';
import ControlButton from './button';
import RunButton from './run-button';

interface IControllButtonsProps {
    suiteIds?: any;
    running?: boolean;
    autoRun?: any;
    failed?: any;
    actions?: any;
}

class ControlButtons extends Component<IControllButtonsProps> {
    _runFailedTests = () => {
        const {actions, failed} = this.props;

        return actions.runFailedTests(failed);
    }

    _acceptAll = () => {
        const {actions, failed} = this.props;

        return actions.acceptAll(failed);
    }

    render() {
        const {actions, suiteIds, failed, running, autoRun} = this.props;

        return (
            <div className='control-buttons'>
                <RunButton
                    autoRun={autoRun}
                    isDisabled={!suiteIds.all.length || running}
                    handler={actions.runAllTests}
                />
                <ControlButton
                    label='Retry failed tests'
                    isDisabled={running || !failed.length}
                    handler={this._runFailedTests}
                />
                <ControlButton
                    label='Accept all'
                    isDisabled={running || !failed.length}
                    handler={this._acceptAll}
                />
                <CommonControls/>
            </div>
        );
    }
}

export default connect<{}, {}, IControllButtonsProps>(
    (state: any) => ({
        suiteIds: state.suiteIds,
        running: state.running,
        autoRun: state.autoRun,
        failed: values(pick(state.suites, state.suiteIds.failed))
    }),
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(ControlButtons);