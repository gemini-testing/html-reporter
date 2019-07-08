'use strict';

import React, {Component, Fragment} from 'react';
import Header from './header';
import ControlButtons from './controls/report-controls';
import SkippedList from './skipped-list';
import MainTree from './main-tree';

export default class Report extends Component {
    render() {
        return (
            <Fragment>
                <Header/>
                <ControlButtons/>
                <SkippedList/>
                <MainTree/>
            </Fragment>
        );
    }
}
