'use strict';

import React, {Component, ComponentState} from 'react';
import {cn} from '@bem-react/classname';

interface IToggleOpenChildState extends ComponentState{
    isCollapsed: boolean;
}

interface IToggleOpenChildProps extends React.Props<any>{
    title: string;
    content: any;
}

export default class ToggleOpen extends Component<IToggleOpenChildProps, IToggleOpenChildState> {

    constructor(props: IToggleOpenChildProps){
        super(props);

        this.state = {
            isCollapsed: true
        };
        this.toggleHandler.bind(this);
    }

    render() {
        const {title, content} = this.props;
        const toggle = cn(
            'toggle-open'
        );

        return (
            <div className={toggle(null, {collapsed: this.state.isCollapsed})}>
                <div onClick={this.toggleHandler} className='toggle-open__switcher'>{title}</div>
                <div className='toggle-open__content'>{content}</div>
            </div>
        );
    }

    toggleHandler(event: React.MouseEvent<HTMLDivElement>) {
        event.preventDefault();
        this.setState({
            isCollapsed: !this.state.isCollapsed
        });
    }
}
