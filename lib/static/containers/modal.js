'use strict';

import React, {Component} from 'react';
import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';
import * as actions from '../modules/actions';
import FindSameDiffsModal from '../components/modals/find-same-diffs';
import modalTypes from '../modules/modal-types';

const MODAL_COMPONENTS = {
    [modalTypes.FIND_SAME_DIFFS_MODAL]: FindSameDiffsModal
};

class ModalContainer extends Component {
    onCancel = () => {
        this.props.actions.hideModal();
    }

    render() {
        const {modal} = this.props;

        if (!modal.type) {
            return null;
        }

        const SpecificModal = MODAL_COMPONENTS[modal.type];

        return <SpecificModal onCancel={this.onCancel} {...modal.data} />;
    }
}

export default connect(
    ({modal}) => ({modal}),
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(ModalContainer);
