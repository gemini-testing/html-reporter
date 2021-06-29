import React, {Component} from 'react';
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import * as actions from '../../modules/actions';
import CommonControls from './common-controls';
import CustomGuiControls from './custom-gui-controls';
import ControlButton from './control-button';
import RunButton from './run-button';
import AcceptOpenedButton from './accept-opened-button';
import CommonFilters from './common-filters';
import {getFailedTests} from '../../modules/selectors/tree';

import './controls.less';
import './gui-controls.css';

class GuiControls extends Component {
    static propTypes = {
        // from store
        running: PropTypes.bool.isRequired,
        processing: PropTypes.bool.isRequired,
        serverStopped: PropTypes.bool.isRequired,
        autoRun: PropTypes.bool.isRequired,
        allRootSuiteIds: PropTypes.arrayOf(PropTypes.string).isRequired,
        failedRootSuiteIds: PropTypes.arrayOf(PropTypes.string).isRequired,
        failedTests: PropTypes.arrayOf(PropTypes.shape({
            testName: PropTypes.string,
            browserName: PropTypes.string
        })).isRequired
    }

    _runFailedTests = () => {
        const {actions, failedTests} = this.props;

        return actions.runFailedTests(failedTests);
    }

    render() {
        const {actions, allRootSuiteIds, failedRootSuiteIds, running, serverStopped, autoRun, processing} = this.props;
        const isDisabled = items => !items.length || processing || serverStopped;

        return (
            <div className="main-menu container">
                <CustomGuiControls />
                <div className="control-buttons">
                    <RunButton
                        autoRun={autoRun}
                        isLoading={running}
                        isDisabled={isDisabled(allRootSuiteIds)}
                        handler={actions.runAllTests}
                        isRunning={running}
                    />
                    <ControlButton
                        label="Retry failed tests"
                        isDisabled={isDisabled(failedRootSuiteIds)}
                        handler={this._runFailedTests}
                    />
                    <AcceptOpenedButton />
                    <ControlButton
                        label="Stop server"
                        isDisabled={serverStopped}
                        handler={actions.stopServer}
                    />
                    <CommonControls/>
                </div>
                <CommonFilters/>
            </div>
        );
    }
}

export default connect(
    (state) => {
        return {
            running: state.running,
            processing: state.processing,
            serverStopped: state.serverStopped,
            autoRun: state.autoRun,
            allRootSuiteIds: state.tree.suites.allRootIds,
            failedRootSuiteIds: state.tree.suites.failedRootIds,
            failedTests: getFailedTests(state)
        };
    },
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(GuiControls);
