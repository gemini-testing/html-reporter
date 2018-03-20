'use strict';

import React, {Component} from 'react';
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import * as actions from '../../modules/actions';
import CommonControls from './common-controls';
import ControlButton from './button';
import RunButton from './run-button';

class ControlButtons extends Component {
    _runFailedTests = () => {
        const {actions, failed} = this.props;

        return actions.runFailedTests(failed);
    }

    _acceptAll = () => {
        const {actions, failed} = this.props;

        return actions.acceptAll(failed);
    }

    render() {
        const {actions, failed, running, autoRun} = this.props;

        return (
            <div className="control-buttons">
                <RunButton
                    autoRun={autoRun}
                    isDisabled={running}
                    handler={actions.runAllTests}
                />
                <ControlButton
                    label="Retry failed tests"
                    isDisabled={running || !failed.length}
                    handler={this._runFailedTests}
                />
                <ControlButton
                    label="Accept all"
                    isDisabled={running || !failed.length}
                    handler={this._acceptAll}
                />
                <CommonControls/>
            </div>
        );
    }
}

export default connect(
    (state) => ({
        view: state.view,
        failed: state.suites.failed,
        running: state.running,
        autoRun: state.autoRun
    }),
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(ControlButtons);
