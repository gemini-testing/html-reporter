'use strict';

import React, {Component} from 'react';
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import {pick, values} from 'lodash';
import PropTypes from 'prop-types';
import * as actions from '../../modules/actions';
import CommonControls from './common-controls';
import CustomGuiControls from './custom-gui-controls';
import ControlButton from './control-button';
import RunButton from './run-button';
import CommonFilters from './common-filters';

import './controls.less';
import './gui-controls.css';

class GuiControls extends Component {
    static propTypes = {
        suiteIds: PropTypes.object,
        running: PropTypes.bool,
        processing: PropTypes.bool,
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
        const {actions, suiteIds, failed, running, autoRun, processing} = this.props;

        return (
            <div className="main-menu container">
                <div className="control-buttons">
                    <RunButton
                        autoRun={autoRun}
                        isDisabled={!suiteIds.all.length || processing}
                        handler={actions.runAllTests}
                        isRunning={running}
                    />
                    <ControlButton
                        label="Retry failed tests"
                        isDisabled={!failed.length || processing}
                        handler={this._runFailedTests}
                    />
                    <ControlButton
                        label="Accept opened"
                        isDisabled={!failed.length || processing}
                        handler={this._acceptOpened}
                    />
                    <CommonControls/>
                </div>
                <CommonFilters/>
                <CustomGuiControls/>
            </div>
        );
    }
}

export default connect(
    ({reporter: {suiteIds, running, processing, autoRun, suites}}) => ({
        suiteIds, running, processing, autoRun,
        failed: values(pick(suites, suiteIds.failed))
    }),
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(GuiControls);
