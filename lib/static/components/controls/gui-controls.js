'use strict';

import React, {Component} from 'react';
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import * as actions from '../../modules/actions';
import CommonControls from './common-controls';
import ControlButton from './button';

class ControlButtons extends Component {
    _runFailedTests = () => {
        const {actions, failed} = this.props;

        return actions.runFailedTests(failed);
    }

    render() {
        const {actions, running, failed} = this.props;

        return (
            <div className="control-buttons">
                <ControlButton
                    label="Run"
                    isAction={true}
                    handler={actions.runAllTests}
                    isDisabled={running}
                />
                <ControlButton
                    label="Retry failed tests"
                    isDisabled={running || !failed.length}
                    handler={this._runFailedTests}
                />
                <ControlButton
                    label="Accept all"
                    handler={actions.acceptAll}
                    isDisabled={running || !failed.length}
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
        running: state.running
    }),
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(ControlButtons);
