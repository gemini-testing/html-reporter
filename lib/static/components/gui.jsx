import React, {Component, Fragment} from 'react';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import NotificationsSystem, {wyboTheme} from 'reapop';
import {bindActionCreators} from 'redux';

import {ROOT} from '../../constants/extension-points';
import * as actions from '../modules/actions';
import Loading from './loading';
import StickyHeader from './sticky-header/gui';
import ModalContainer from '../containers/modal';
import MainTree from './main-tree';
import {CustomScripts} from '../new-ui/components/CustomScripts';
import FaviconChanger from './favicon-changer';
import ExtensionPoint from './extension-point';
import BottomProgressBar from './bottom-progress-bar';
import {MetrikaScript} from '@/static/new-ui/components/MetrikaScript';
import {ClientEvents} from '../../gui/constants/client-events';

class Gui extends Component {
    static propTypes = {
        // from store
        loading: PropTypes.shape({
            active: PropTypes.bool,
            content: PropTypes.string
        }).isRequired,
        customScripts: PropTypes.array,
        notifications: PropTypes.array,
        actions: PropTypes.object.isRequired,
        allRootSuiteIds: PropTypes.array.isRequired
    };

    componentDidMount() {
        this.props.actions.thunkInitGuiReport();
        this._subscribeToEvents();
    }

    componentWillUnmount() {
        this.props.actions.finGuiReport();
    }

    _subscribeToEvents() {
        const {actions} = this.props;
        const eventSource = new EventSource('/events');

        eventSource.addEventListener(ClientEvents.BEGIN_SUITE, (e) => {
            const data = JSON.parse(e.data);
            actions.suiteBegin(data);
        });

        eventSource.addEventListener(ClientEvents.BEGIN_STATE, (e) => {
            const data = JSON.parse(e.data);
            actions.testBegin(data);
        });

        [ClientEvents.TEST_RESULT, ClientEvents.ERROR].forEach((eventName) => {
            eventSource.addEventListener(eventName, (e) => {
                const data = JSON.parse(e.data);
                actions.testResult(data);
            });
        });

        eventSource.addEventListener(ClientEvents.END, () => {
            actions.thunkTestsEnd();
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
                    <MetrikaScript />
                    {notificationElem}
                    <FaviconChanger />
                    <StickyHeader />
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
