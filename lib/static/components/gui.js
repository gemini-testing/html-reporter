'use strict';

import React, {Component, Fragment} from 'react';
import ControlButtons from './controls/gui-controls';
import Suites from './suites';

export default class Gui extends Component {
    render() {
        return (
            <Fragment>
                <ControlButtons/>
                <Suites/>
            </Fragment>
        );
    }
}
