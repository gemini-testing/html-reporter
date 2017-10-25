'use strict';
import React, {Component} from 'react';
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import * as actions from '../../modules/actions';
import ControlButton from './button';
import ViewSelect from './view-select';
import BaseHostInput from './base-host';

class ControlButtons extends Component {
    render() {
        const {view, actions} = this.props;

        return (
            <div className="control-buttons">
                <ViewSelect options = {[
                    {value: 'all', text: 'Show all'},
                    {value: 'failed', text: 'Show only failed'}
                ]}/>
                <ControlButton
                    label="Expand all"
                    isActive={view.expand === 'all'}
                    handler={actions.expandAll}
                />
                <ControlButton
                    label="Collapse all"
                    isActive={view.expand === 'none'}
                    handler={actions.collapseAll}
                />
                <ControlButton
                    label="Expand errors"
                    isActive={view.expand === 'errors'}
                    handler={actions.expandErrors}
                />
                <ControlButton
                    label="Show skipped"
                    isActive={view.showSkipped}
                    handler={actions.toggleSkipped}
                />
                <ControlButton
                    label="Expand retries"
                    isActive={view.showRetries}
                    handler={actions.toggleRetries}
                />
                <ControlButton
                    label="Show only diff"
                    isActive={view.showOnlyDiff}
                    handler={actions.toggleOnlyDiff}
                />
                <BaseHostInput/>
            </div>
        );
    }
}

export default connect(
    (state) => ({view: state.view}),
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(ControlButtons);
