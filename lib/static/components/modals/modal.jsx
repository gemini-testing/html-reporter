import React, {Component} from 'react';
import { Portal } from '@gravity-ui/uikit';
import './modal.css';

export default class Modal extends Component {
    componentWillMount() {
        document.body.classList.add('modal-open');
    }

    componentWillUnmount() {
        document.body.classList.remove('modal-open');
    }

    render() {
        const {className, children} = this.props;

        return (
            <Portal>
                <div className={className}>
                    {children}
                </div>
            </Portal>
        )
    }
}
