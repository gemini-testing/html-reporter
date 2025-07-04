import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import {capitalize} from 'lodash';
import * as actions from '../../modules/actions';
import ControlSelect from './selects/control';
import GroupTestsSelect from './selects/group-tests';
import BaseHostInput from './base-host-input';
import MenuBar from './menu-bar';
import ReportInfo from './report-info';
import {ViewMode} from '../../../constants/view-modes';
import {DiffModes} from '../../../constants/diff-modes';
import {EXPAND_ALL, COLLAPSE_ALL, EXPAND_ERRORS, EXPAND_RETRIES} from '../../../constants/expand-modes';

class ControlButtons extends Component {
    static propTypes = {
        view: PropTypes.shape({
            expand: PropTypes.string.isRequired,
            viewMode: PropTypes.string.isRequired,
            diffMode: PropTypes.string.isRequired
        }),
        app: PropTypes.object.isRequired,
        isStatisImageAccepterEnabled: PropTypes.bool,
        actions: PropTypes.object.isRequired
    };

    _onUpdateExpand = (value) => {
        const {actions} = this.props;
        const actionsDict = {
            [EXPAND_ALL]: actions.expandAll,
            [COLLAPSE_ALL]: actions.collapseAll,
            [EXPAND_ERRORS]: actions.expandErrors,
            [EXPAND_RETRIES]: actions.expandRetries
        };
        actionsDict[value].call();
    };

    _getShowTestsOptions() {
        const viewModes = Object.values(ViewMode).map(value => ({value, content: capitalize(value)}));

        return this.props.isStatisImageAccepterEnabled
            ? viewModes
            : viewModes.filter(viewMode => ![ViewMode.STAGED, ViewMode.COMMITED].includes(viewMode.value));
    }

    render() {
        const {actions, view, app} = this.props;

        return (
            <React.Fragment>
                <ControlSelect
                    size='s'
                    label="Show tests"
                    value={app.suitesPage.viewMode}
                    handler={(data) => actions.changeViewMode({data, page: 'suitesPage'})}
                    options = {this._getShowTestsOptions()}
                />
                <ControlSelect
                    size='m'
                    label="Expand"
                    value={view.expand}
                    handler={this._onUpdateExpand}
                    qa='expand-dropdown'
                    options={[
                        {value: EXPAND_ALL, content: 'All'},
                        {value: COLLAPSE_ALL, content: 'None'},
                        {value: EXPAND_ERRORS, content: 'Errors'},
                        {value: EXPAND_RETRIES, content: 'Retries'}
                    ]}
                    extendClassNames='expand-dropdown'
                    extendPopupClassNames='expand-popup'
                />
                <GroupTestsSelect />
                <ControlSelect
                    size='m'
                    label="Diff mode"
                    value={view.diffMode}
                    handler={diffModeId => actions.setDiffMode({diffModeId})}
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
    ({view, app, staticImageAccepter: {enabled}}) => ({view, app, isStatisImageAccepterEnabled: enabled}),
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(ControlButtons);
