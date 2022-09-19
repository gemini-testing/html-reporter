import React, {Component, Fragment} from 'react';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import NotificationsSystem, {wyboTheme} from 'reapop';
import {bindActionCreators} from 'redux';

import {ROOT} from '../../constants/extension-points';
import * as actions from '../modules/actions';
import ControlButtons from './controls/gui-controls';
import Loading from './loading';
import ModalContainer from '../containers/modal';
import MainTree from './main-tree';
import CustomScripts from './custom-scripts';
import clientEvents from '../../gui/constants/client-events';
import FaviconChanger from './favicon-changer';
import ExtensionPoint from './extension-point';
import BottomProgressBar from './bottom-progress-bar';

class Gui extends Component {
    static propTypes = {
        // from store
        loading: PropTypes.shape({
            active: PropTypes.bool,
            content: PropTypes.string
        }).isRequired,
        customScripts: PropTypes.array,
        notifications: PropTypes.array
    }

    componentDidMount() {
        this.props.actions.initGuiReport();
        this._subscribeToEvents();
    }

    componentWillUnmount() {
        this.props.actions.finGuiReport();
    }

    _subscribeToEvents() {
        const {actions} = this.props;
        const eventSource = new EventSource('/events');

        eventSource.addEventListener(clientEvents.BEGIN_SUITE, (e) => {
            const data = JSON.parse(e.data);
            actions.suiteBegin(data);
        });

        eventSource.addEventListener(clientEvents.BEGIN_STATE, (e) => {
            const data = JSON.parse(e.data);
            actions.testBegin(data);
        });

        [clientEvents.TEST_RESULT, clientEvents.ERROR].forEach((eventName) => {
            eventSource.addEventListener(eventName, (e) => {
                const data = JSON.parse(e.data);
                actions.testResult(data);
            });
        });

        eventSource.addEventListener(clientEvents.END, () => {
            actions.testsEnd();
        });
    }

    render() {
        const {allRootSuiteIds, loading, customScripts, notifications, actions} = this.props;
        const notificationElem = <NotificationsSystem theme={wyboTheme} notifications={notifications} dismissNotification={actions.dismissNotification} />;

        if (!allRootSuiteIds.length) {
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
                    <CustomScripts scripts={customScripts}/>
                    {notificationElem}
                    <FaviconChanger />
                    <ControlButtons />
                    <main className="container">
                        <MainTree />
                    </main>
                    <Loading active={loading.active} content={loading.content} />
                    <ModalContainer />
                    <BottomProgressBar />
                </ExtensionPoint>
            </Fragment>
        );
    }
}

export default connect(
    ({tree, loading, config: {customScripts}, notifications}) => ({
        allRootSuiteIds: tree.suites.allRootIds,
        loading,
        customScripts,
        notifications
    }),
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(Gui);
