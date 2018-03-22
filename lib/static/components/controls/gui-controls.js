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
        const {actions, suites} = this.props;

        return actions.runFailedTests(suites.failed);
    }

    _acceptAll = () => {
        const {actions, suites} = this.props;

        return actions.acceptAll(suites.failed);
    }

    render() {
        const {actions, suites, running, autoRun} = this.props;

        return (
            <div className="control-buttons">
                <RunButton
                    autoRun={autoRun}
                    isDisabled={!suites.all.length || running}
                    handler={actions.runAllTests}
                />
                <ControlButton
                    label="Retry failed tests"
                    isDisabled={running || !suites.failed.length}
                    handler={this._runFailedTests}
                />
                <ControlButton
                    label="Accept all"
                    isDisabled={running || !suites.failed.length}
                    handler={this._acceptAll}
                />
                <CommonControls/>
            </div>
        );
    }
}

export default connect(
    (state) => ({
        suites: state.suites,
        running: state.running,
        autoRun: state.autoRun
    }),
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(ControlButtons);
