'use strict';

import React, {Component, ComponentState} from 'react';
import {cn, classnames} from '@bem-react/classname';

interface ISwitcherStyleProps extends React.Props<any>{
    onChange(index: number): void;
}

interface ISwitcherStyleStates extends ComponentState{
    color: number;
}

export default class SwitcherStyle extends Component<ISwitcherStyleProps, ISwitcherStyleStates> {

    constructor(props: ISwitcherStyleProps, state: ISwitcherStyleStates) {
        super(props, state);
        this.state = {color: 1};
    }

    render() {
        return (
            <div className='cswitcher'>
                {this._drawButton(1)}
                {this._drawButton(2)}
                {this._drawButton(3)}
            </div>
        );
    }

    private _drawButton(index: number) {
        const stateButton = cn('state-button');
        const cswitcher = cn('cswitcher');

        const cN = classnames(stateButton(), cswitcher('item', {selected: index === this.state.color, color: index}));

        return (
            <button
                className={cN}
                onClick={() => this._onChange(index)}>
                &nbsp;
            </button>
        );
    }

    private _onChange(index: number) {
        this.setState({color: index});
        this.props.onChange(index);
    }
}