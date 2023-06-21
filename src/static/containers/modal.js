import React, {Component} from 'react';
import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';
import PropTypes from 'prop-types';
import {isEmpty} from 'lodash';
import Modal from '../components/modals/modal';
import * as actions from '../modules/actions';
import * as Modals from '../components/modals';

class ModalContainer extends Component {
    static propTypes = {
        // from store
        modals: PropTypes.arrayOf(PropTypes.shape({
            id: PropTypes.string,
            type: PropTypes.string,
            className: PropTypes.string,
            data: PropTypes.object
        })).isRequired
    }

    render() {
        const {modals, actions} = this.props;

        if (isEmpty(modals)) {
            return null;
        }

        return modals.map(({id, type, className, data}) => {
            const SpecifiedModal = Modals[type];

            return (
                <Modal key={id} className={className}>
                    <SpecifiedModal {...data} onClose={() => actions.closeModal({id})} />
                </Modal>
            );
        });
    }
}

export default connect(
    ({modals}) => ({modals}),
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(ModalContainer);
