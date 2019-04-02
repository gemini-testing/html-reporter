'use strict';

import React, {Component, Fragment} from 'react';
import {connect} from 'react-redux';

import {initial} from '../modules/actions';
import ControlButtons from './controls/gui-controls';
import SkippedList from './skipped-list';
import Loading from './loading';
import ModalContainer from '../containers/modal';
import MainTree from './main-tree';

class Gui extends Component {
    componentDidMount() {
        this.props.gui && this.props.initial();
    }

    render() {
        const {loading} = this.props;

        return (
            <Fragment>
                <ControlButtons />
                <SkippedList />
                <MainTree />
                <Loading active={loading.active} content={loading.content} />
                <ModalContainer />
            </Fragment>
        );
    }
}

export default connect(({gui, loading}) => ({gui, loading}), {initial})(Gui);
