import React, {Component, Fragment} from 'react';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import Notifications from 'reapop';
import wybo from 'reapop-theme-wybo';
import {bindActionCreators} from 'redux';

import * as actions from '../modules/actions';
import Loading from './loading';
import Header from './header';
import ControlButtons from './controls/report-controls';
import SkippedList from './skipped-list';
import MainTree from './main-tree';
import CustomScripts from './custom-scripts';

class Report extends Component {
    static propTypes = {
        // from store
        allRootSuiteIds: PropTypes.arrayOf(PropTypes.string).isRequired,
        fetchDbDetails: PropTypes.array.isRequired,
        customScripts: PropTypes.array
    }

    componentDidMount() {
        this.props.actions.initStaticReport();
    }

    componentWillUnmount() {
        this.props.actions.finStaticReport();
    }

    render() {
        const {allRootSuiteIds, fetchDbDetails} = this.props;

        if (!allRootSuiteIds.length && !fetchDbDetails.length) {
            return (<Loading active={true} />);
        }

        return (
            <Fragment>
                <CustomScripts scripts={this.props.customScripts}/>
                <Notifications theme={wybo} />
                <Header/>
                <ControlButtons/>
                <main className="container">
                    <SkippedList />
                    <MainTree />
                </main>
            </Fragment>
        );
    }
}

export default connect(
    ({tree, fetchDbDetails, config}) => ({
        allRootSuiteIds: tree.suites.allRootIds,
        fetchDbDetails,
        customScripts: config.customScripts
    }),
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(Report);
