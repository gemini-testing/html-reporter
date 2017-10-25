'use strict';

import React, {Component, Fragment} from 'react';
import Summary from './summary';
import ControlButtons from './controls';
import SkippedList from './skipped-list';
import Suites from './suites';

export default class Report extends Component {
    render() {
        return (
            <Fragment>
                <Summary/>
                <ControlButtons/>
                <SkippedList/>
                <Suites/>
            </Fragment>
        );
    }
}
