import React, {Component, Fragment} from 'react';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import NotificationsSystem, {wyboTheme} from 'reapop';
import {bindActionCreators} from 'redux';

import {ROOT} from '../../constants/extension-points';
import * as actions from '../modules/actions';
import Loading from './loading';
import Header from './header';
import ControlButtons from './controls/report-controls';
import MainTree from './main-tree';
import CustomScripts from './custom-scripts';
import FaviconChanger from './favicon-changer';
import ExtensionPoint from './extension-point';
import BottomProgressBar from './bottom-progress-bar';

class Report extends Component {
    static propTypes = {
        // from store
        allRootSuiteIds: PropTypes.arrayOf(PropTypes.string).isRequired,
        fetchDbDetails: PropTypes.array.isRequired,
        customScripts: PropTypes.array,
        notifications: PropTypes.array
    }

    componentDidMount() {
        this.props.actions.initStaticReport();
    }

    componentWillUnmount() {
        this.props.actions.finStaticReport();
    }

    render() {
        const {allRootSuiteIds, fetchDbDetails, notifications, actions} = this.props;
        const notificationElem = <NotificationsSystem theme={wyboTheme} notifications={notifications} dismissNotification={actions.dismissNotification} />;

        if (!allRootSuiteIds.length && !fetchDbDetails.length) {
            return (
                <Fragment>
                    {notificationElem}
                    <Loading active={true} />
                </Fragment>
            );
        }

        return (
            <Fragment>
                <ExtensionPoint name={ROOT}>
                    <CustomScripts scripts={this.props.customScripts}/>
                    {notificationElem}
                    <FaviconChanger />
                    <Header/>
                    <ControlButtons/>
                    <main className="container">
                        <MainTree />
                    </main>
                    <BottomProgressBar />
                </ExtensionPoint>
            </Fragment>
        );
    }
}

export default connect(
    ({tree, fetchDbDetails, config, notifications}) => ({
        allRootSuiteIds: tree.suites.allRootIds,
        fetchDbDetails,
        customScripts: config.customScripts,
        notifications
    }),
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(Report);
