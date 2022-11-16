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

import './controls.less';

class GuiControls extends Component {
    static propTypes = {
        // from store
        running: PropTypes.bool.isRequired,
        stopping: PropTypes.bool.isRequired,
        serverStopped: PropTypes.bool.isRequired
    };

    render() {
        const {actions, running, stopping, serverStopped} = this.props;
        return (
            <div className="main-menu container">
                <CustomGuiControls />
                <div className="control-container control-buttons">
                    <RunButton />
                    <ControlButton
                        label="Stop tests"
                        isDisabled={!running || stopping}
                        handler={actions.stopTests}
                    />
                    <ControlButton
                        label="Stop server"
                        isDisabled={serverStopped}
                        handler={actions.stopServer}
                    />
                    <AcceptOpenedButton />
                    <CommonControls/>
                </div>
                <CommonFilters/>
            </div>
        );
    }
}

export default connect(
    ({running, stopping, serverStopped}) => ({running, stopping, serverStopped}),
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(GuiControls);
