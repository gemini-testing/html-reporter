import React, {Component} from 'react';
import {Portal} from '@gravity-ui/uikit';
import PropTypes from 'prop-types';
import './modal.css';

class Modal extends Component {
    componentDidMount() {
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
        );
    }
}

Modal.propTypes = {
    className: PropTypes.string,
    children: PropTypes.oneOfType([PropTypes.element, PropTypes.string])
};

export default Modal;
