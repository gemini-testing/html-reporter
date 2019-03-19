'use strict';

import React, {Component, Fragment} from 'react';
import Summary from './summary';
import ControlButtons from './controls/report-controls';
import SkippedList from './skipped-list';
import MainTree from './main-tree';

export default class Report extends Component {
    render() {
        return (
            <Fragment>
                <Summary/>
                <ControlButtons/>
                <SkippedList/>
                <MainTree/>
            </Fragment>
        );
    }
}
