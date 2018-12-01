import React, {Component} from 'react';
import ControlButton from './button';

interface IRunButton {
    handler: any;
    autoRun: any;
    isDisabled?: any;
}

export default class RunButton extends Component<IRunButton> {

    componentWillReceiveProps({autoRun}: any) {
        if (this.props.autoRun !== autoRun && autoRun) {
            this.props.handler();
        }
    }

    render() {
        const {handler, isDisabled} = this.props;

        return (<ControlButton label='Run' isAction={true} handler={handler} isDisabled={isDisabled} />);
    }
}
