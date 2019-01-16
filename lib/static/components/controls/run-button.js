'use strict';

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import ControlButton from './control-button';

export default class RunButton extends Component {
    static propTypes = {
        handler: PropTypes.func.isRequired,
        autoRun: PropTypes.bool.isRequired,
        isDisabled: PropTypes.bool
    }

    componentWillReceiveProps({autoRun}) {
        if (this.props.autoRun !== autoRun && autoRun) {
            this.props.handler();
        }
    }

    render() {
        const {handler, isDisabled} = this.props;

        return (<ControlButton label="Run" isAction={true} handler={handler} isDisabled={isDisabled} />);
    }
}
