'use strict';

import React, {Component, Fragment} from 'react';
import {connect} from 'react-redux';
import Header from './header';
import ControlButtons from './controls/report-controls';
import SkippedList from './skipped-list';
import MainTree from './main-tree';
import CustomScripts from './custom-scripts';

class Report extends Component {
    render() {
        return (
            <Fragment>
                <CustomScripts scripts={this.props.customScripts}/>
                <Header/>
                <ControlButtons/>
                <SkippedList/>
                <MainTree/>
            </Fragment>
        );
    }
}

export default connect(({reporter: {config}}) => ({customScripts: config.customScripts}))(Report);
