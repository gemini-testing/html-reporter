'use strict';

import React, {Component, Fragment} from 'react';
import {connect} from 'react-redux';
import {initial} from '../modules/actions';
import ControlButtons from './controls/gui-controls';
import SkippedList from './skipped-list';
import Suites from './suites';

class Gui extends Component<any> {
    componentDidMount() {
        this.props.gui && this.props.initial();
    }

    render() {
        return (
            <Fragment>
                <ControlButtons/>
                <SkippedList/>
                <Suites/>
            </Fragment>
        );
    }
}

export default connect(({gui}: any) => ({gui}), {initial})(Gui);
