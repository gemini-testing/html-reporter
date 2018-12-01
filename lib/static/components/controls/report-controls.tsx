import React, {Component} from 'react';
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import * as actions from '../../modules/actions';
import CommonControls from './common-controls';

class ControlButtons extends Component {
    render() {
        return (
            <div className='control-buttons'>
                <CommonControls/>
            </div>
        );
    }
}

export default connect(
    (state: any) => ({view: state.view}),
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(ControlButtons);
