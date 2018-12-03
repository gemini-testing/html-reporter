'use strict';

import React, {Component, ComponentState} from 'react';
import {cn} from '@bem-react/classname';

interface ISwitcherRetryProps extends React.Props<any>{
    retries?: any[];
    onChange(index: number): void;
}

interface ISwitcherRetryStates extends ComponentState{
    retry: number;
}

export default class SwitcherRetry extends Component<ISwitcherRetryProps, ISwitcherRetryStates> {

    public static defaultProps: Partial<ISwitcherRetryProps> = {
        retries: []
    };

    constructor(props: ISwitcherRetryProps, state: ISwitcherRetryStates) {
        super(props, state);
        this.state = {retry: !this.props.retries ? 0 : this.props.retries.length};
        this._onChange.bind(this);
    }

    render() {
        const retries = this.props.retries;

        if (!retries || retries.length === 0) {
            return null;
        }

        const buttonsTmpl = [];
        for (let i = 0; i <= retries.length; i++) {
            const stateButton = cn('state-button');
            buttonsTmpl.push(
                <button key={i} className={stateButton('tab-switcher__button',
                    { 'tab-switcher__button_active': i === this.state.retry})}
                        onClick={() => this._onChange(i)}>{i + 1}</button>
            );
        }

        return (<div className='tab-switcher'>{buttonsTmpl}</div>);
    }

    private _onChange(index: number) {
        this.setState({retry: index});
        this.props.onChange(index);
    }
}