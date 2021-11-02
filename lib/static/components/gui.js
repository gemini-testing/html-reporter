import React, {Component, Fragment} from 'react';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import Notifications from 'reapop';
import wybo from 'reapop-theme-wybo';
import {bindActionCreators} from 'redux';

import {ROOT} from '../../constants/extension-points';
import * as actions from '../modules/actions';
import ControlButtons from './controls/gui-controls';
import SkippedList from './skipped-list';
import Loading from './loading';
import ModalContainer from '../containers/modal';
import MainTree from './main-tree';
import CustomScripts from './custom-scripts';
import clientEvents from '../../gui/constants/client-events';
import FaviconChanger from './favicon-changer';
import ExtensionPoint from './extension-point';

class Gui extends Component {
    static propTypes = {
        // from store
        loading: PropTypes.shape({
            active: PropTypes.bool,
            content: PropTypes.string
        }).isRequired,
        customScripts: PropTypes.array
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
        const {allRootSuiteIds, loading, customScripts} = this.props;

        if (!allRootSuiteIds.length) {
            return (
                <Fragment>
                    <Notifications theme={wybo}/>
                    <Loading active={true} />
                </Fragment>
            );
        }

        return (
            <Fragment>
                <ExtensionPoint name={ROOT}>
                    <CustomScripts scripts={customScripts}/>
                    <Notifications theme={wybo}/>
                    <FaviconChanger />
                    <ControlButtons />
                    <main className="container">
                        <SkippedList />
                        <MainTree />
                    </main>
                    <Loading active={loading.active} content={loading.content} />
                    <ModalContainer />
                </ExtensionPoint>
            </Fragment>
        );
    }
}

export default connect(
    ({tree, loading, config: {customScripts}}) => ({
        allRootSuiteIds: tree.suites.allRootIds,
        loading,
        customScripts
    }),
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(Gui);
