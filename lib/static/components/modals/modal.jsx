import React, {Component} from 'react';
import ReactDOM from 'react-dom';
import './modal.css';

export default class Modal extends Component {
    componentWillMount() {
        this._root = document.createElement('div');
        document.body.classList.add('modal-open');
        document.body.appendChild(this._root);
    }

    componentWillUnmount() {
        document.body.classList.remove('modal-open');
        document.body.removeChild(this._root);
    }

    render() {
        const {className} = this.props;

        return ReactDOM.createPortal(
            <div className={className}>
                {this.props.children}
            </div>,
            this._root
        );
    }
}
