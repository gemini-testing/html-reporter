'use strict';

import React, {Component} from 'react';
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import * as actions from '../../modules/actions';
import CommonControls from './common-controls';
import ControlButton from './button';

class ControlButtons extends Component {
    render() {
        const {actions} = this.props;

        return (
            <div className="control-buttons">
                <ControlButton
                    label="Run"
                    isAction={true}
                    handler={actions.runAllTests}
                />
                <ControlButton
                    label="Retry failed tests"
                    isDisabled={true}
                    handler={actions.runFailed}
                />
                <ControlButton
                    label="Accept all"
                    handler={actions.acceptAll}
                />
                <CommonControls/>
            </div>
        );
    }
}

export default connect(
    (state) => ({view: state.view}),
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(ControlButtons);
