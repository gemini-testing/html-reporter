'use strict';

import React, {Component} from 'react';
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import {pick, values} from 'lodash';
import PropTypes from 'prop-types';
import * as actions from '../../modules/actions';
import CommonControls from './common-controls';
import ControlButton from './button';
import RunButton from './run-button';

class ControlButtons extends Component {
    static propTypes = {
        suiteIds: PropTypes.object,
        running: PropTypes.bool,
        autoRun: PropTypes.bool,
        failed: PropTypes.array
    }

    _runFailedTests = () => {
        const {actions, failed} = this.props;

        return actions.runFailedTests(failed);
    }

    _reloadTests = () => {
        const {actions} = this.props;

        return actions.reloadTests();
    }

    _saveTests = () => {
        const {actions} = this.props;

        return actions.saveTests();
    }

    _acceptAll = () => {
        const {actions, failed} = this.props;

        return actions.acceptAll(failed);
    }

    render() {
        const {actions, suiteIds, failed, running, autoRun} = this.props;

        return (
            <div className="control-buttons">
                <div className="control-group">
                    <ControlButton
                        label="Reload"
                        title="Reload tests"
                        isDisabled={running || !suiteIds.all.length}
                        handler={this._reloadTests}
                    />
                    <ControlButton
                        label="Save"
                        title="Save tests"
                        isDisabled={running || !suiteIds.all.length}
                        handler={this._saveTests}
                    />
                </div>
                <RunButton
                    autoRun={autoRun}
                    isDisabled={!suiteIds.all.length || running}
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
        suiteIds: state.suiteIds,
        running: state.running,
        autoRun: state.autoRun,
        failed: values(pick(state.suites, state.suiteIds.failed))
    }),
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(ControlButtons);
