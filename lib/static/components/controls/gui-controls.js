'use strict';

import React, {Component, Fragment} from 'react';
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import {pick, values} from 'lodash';
import PropTypes from 'prop-types';
import * as actions from '../../modules/actions';
import CommonControls from './common-controls';
import ControlButton from './control-button';
import RunButton from './run-button';
import CommonFilters from './common-filters';

class GuiControls extends Component {
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

    _acceptOpened = () => {
        const {actions, failed} = this.props;

        return actions.acceptOpened(failed);
    }

    render() {
        const {actions, suiteIds, failed, running, autoRun} = this.props;

        return (
            <Fragment>
                <div className="control-buttons">
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
                        label="Accept opened"
                        isDisabled={running || !failed.length}
                        handler={this._acceptOpened}
                    />
                    <CommonControls/>
                </div>
                <CommonFilters/>
            </Fragment>
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
)(GuiControls);
