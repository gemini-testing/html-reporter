import React, {Component} from 'react';
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import {capitalize} from 'lodash';
import * as actions from '../../modules/actions';
import ControlButton from './control-button';
import ControlSelect from './selects/control';
import GroupTestsSelect from './selects/group-tests';
import BaseHostInput from './base-host-input';
import MenuBar from './menu-bar';
import ReportInfo from './report-info';
import {ViewMode} from '../../../constants/view-modes';
import {DiffModes} from '../../../constants/diff-modes';
import {EXPAND_ALL, COLLAPSE_ALL, EXPAND_ERRORS, EXPAND_RETRIES} from '../../../constants/expand-modes';
import { RadioButton, Select } from '@gravity-ui/uikit';

class ControlButtons extends Component {
    _onUpdateExpand = (value) => {
        const {actions} = this.props;
        const actionsDict = {
            [EXPAND_ALL]: actions.expandAll,
            [COLLAPSE_ALL]: actions.collapseAll,
            [EXPAND_ERRORS]: actions.expandErrors,
            [EXPAND_RETRIES]: actions.expandRetries
        }
        actionsDict[value].call();
    }
    
    render() {
        const {actions, view} = this.props;

        return (
            <React.Fragment>
                <ControlSelect
                    size='s'
                    label="Show tests"
                    value={view.viewMode}
                    handler={actions.changeViewMode}
                    options = {Object.values(ViewMode).map((value) => ({value, content: capitalize(value)}))}
                />
                <ControlSelect 
                    size='m'
                    label="Expand"
                    value={view.expand}
                    handler={this._onUpdateExpand} 
                    qa='expand-dropdown'
                    options={[
                        {value: EXPAND_ALL, content: "All"},
                        {value: COLLAPSE_ALL, content: "None"},
                        {value: EXPAND_ERRORS, content: "Errors"},
                        {value: EXPAND_RETRIES, content: "Retries"}
                    ]}
                    extendClassNames='expand-dropdown'
                    extendPopupClassNames='expand-popup'
                />
                <GroupTestsSelect />
                <ControlSelect
                    size='m'
                    label="Diff mode"
                    value={view.diffMode}
                    handler={actions.changeDiffMode}
                    options = {Object.values(DiffModes).map((dm) => {
                        return {value: dm.id, content: dm.title};
                    })}
                    extendClassNames="diff-mode"
                />
                <BaseHostInput/>
                <MenuBar />
                <ReportInfo />
            </React.Fragment>
        );
    }
}

export default connect(
    ({view}) => ({view}),
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(ControlButtons);
