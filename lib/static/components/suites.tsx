import React, {Component} from 'react';
import {connect} from 'react-redux';
import SectionCommon from './section/section-common';
import {bindActionCreators} from 'redux';
import {suiteBegin, testBegin, testResult, testsEnd} from '../modules/actions';
const clientEvents = require('../../gui/constants/client-events');

interface ISuitesProps extends React.Props<any> {
    suiteIds?: string[];
    gui?: boolean;
    actions?: any;
}

class Suites extends Component<ISuitesProps> {

    componentDidMount() {
        this.props.gui && this._subscribeToEvents();
    }

    _subscribeToEvents() {
        const {actions}: any = this.props;
        const eventSource: EventSource = new EventSource('/events');
        eventSource.addEventListener(clientEvents.BEGIN_SUITE, (e: any) => {
            const data = JSON.parse(e.data);
            actions.suiteBegin(data);
        });

        eventSource.addEventListener(clientEvents.BEGIN_STATE, (e: any) => {
            const data = JSON.parse(e.data);
            actions.testBegin(data);
        });

        [clientEvents.TEST_RESULT, clientEvents.ERROR].forEach((eventName) => {
            eventSource.addEventListener(eventName, (e: any) => {
                const data = JSON.parse(e.data);
                actions.testResult(data);
            });
        });

        eventSource.addEventListener(clientEvents.END, () => {
            this.props.actions.testsEnd();
        });
    }

    render() {
        const {suiteIds} = this.props;

        return (
            <div className='sections'>
                {suiteIds && suiteIds.map((suiteId) => {
                    return <SectionCommon key={suiteId} suiteId={suiteId} />;
                })}
            </div>
        );
    }
}

const actions = {testBegin, suiteBegin, testResult, testsEnd};

export default connect(
    (state: any) => ({
        suiteIds: state.suiteIds[state.view.viewMode],
        gui: state.gui
    }),
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(Suites);
